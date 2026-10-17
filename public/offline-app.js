(() => {
  "use strict";

  const DATABASE_NAME = "fernotech-offline";
  const STORE_NAME = "records";
  const SNAPSHOT_KEY = "snapshot";
  const DB_VERSION = 1;
  let database;
  let snapshot;
  let syncing = false;

  const byId = (id) => document.getElementById(id);
  const feedback = byId("global-feedback");

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function readRecord(id) {
    return new Promise((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function readAllRecords() {
    return new Promise((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function saveRecord(record) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function removeRecord(id) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  function queueId(id) {
    return `queue:${id}`;
  }

  async function readQueue() {
    return (await readAllRecords())
      .filter((record) => record.kind === "queue")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  function setFeedback(message, kind) {
    feedback.textContent = message;
    feedback.className = `feedback ${kind || ""}`;
  }

  function doualaDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Douala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function parseKg(value) {
    const text = String(value).trim().replace(",", ".");
    if (!/^\d{1,7}(?:\.\d{1,3})?$/.test(text)) {
      return null;
    }
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function grams(value) {
    return Math.round(value * 1000);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return replacements[character];
    });
  }

  function addOptions(select, rows, labelFor, emptyLabel) {
    select.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = emptyLabel;
    select.append(empty);
    for (const row of rows) {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = labelFor(row);
      select.append(option);
    }
  }

  function dateLabel(value) {
    return String(value || "").split("-").reverse().join("/");
  }

  async function getVisibleData() {
    if (!snapshot) {
      return null;
    }
    const data = structuredClone(snapshot);
    const pending = (await readQueue()).filter(
      (record) =>
        record.ownerId === snapshot.ownerId,
    );

    for (const record of pending) {
      const item = record.payload;
      if (item.type === "collecteur") {
        if (!data.collectors.some((collector) => collector.id === item.id)) {
          data.collectors.push({
            id: item.id,
            name: item.name,
            isLocal: true,
          });
        }
      } else if (item.type === "apport") {
        if (!data.deliveries.some((delivery) => delivery.id === item.id)) {
          const collector = data.collectors.find(
            (candidate) => candidate.id === item.collectorId,
          );
          data.deliveries.push({
            id: item.id,
            collectorId: item.collectorId,
            collectorName: collector ? collector.name : "Collecteur local",
            deliveryDate: item.deliveryDate,
            collectionPoint: item.collectionPoint,
            plasticType: item.plasticType,
            receivedKg: item.receivedKg,
            acceptedKg: null,
            rejectedKg: null,
            rejectionReason: null,
            status: "recue",
            isLocal: true,
          });
        }
      } else if (item.type === "tri") {
        const delivery = data.deliveries.find(
          (candidate) => candidate.id === item.deliveryId,
        );
        if (delivery) {
          delivery.acceptedKg = item.acceptedKg;
          delivery.rejectedKg = item.rejectedKg;
          delivery.rejectionReason = item.rejectionReason;
          delivery.status = "triee";
        }
      } else if (item.type === "integration") {
        const delivery = data.deliveries.find(
          (candidate) => candidate.id === item.deliveryId,
        );
        if (delivery && delivery.status !== "integree_au_stock") {
          delivery.status = "integree_au_stock";
          const accepted = parseKg(delivery.acceptedKg || "0") || 0;
          const stock = data.materialStock.find(
            (row) => row.plasticType === delivery.plasticType,
          );
          if (accepted > 0 && stock) {
            stock.quantityKg += accepted;
          } else if (accepted > 0) {
            data.materialStock.push({
              plasticType: delivery.plasticType,
              quantityKg: accepted,
            });
          }
        }
      } else if (item.type === "production") {
        const stock = data.materialStock.find(
          (row) => row.plasticType === item.plasticType,
        );
        if (stock) {
          stock.quantityKg -= parseKg(item.materialUsedKg) || 0;
        }
      }
    }

    data.collectors.sort((left, right) => left.name.localeCompare(right.name));
    data.deliveries.sort((left, right) =>
      `${left.deliveryDate}-${left.id}`.localeCompare(
        `${right.deliveryDate}-${right.id}`,
      ),
    );
    return data;
  }

  async function render() {
    const queue = await readQueue();
    const activeQueue = snapshot
      ? queue.filter((record) => record.ownerId === snapshot.ownerId)
      : [];
    const otherAccountCount = queue.length - activeQueue.length;
    const pendingCount = activeQueue.filter(
      (record) => record.state !== "synced",
    ).length;
    const errorsCount = activeQueue.filter(
      (record) => record.state === "error",
    ).length;
    byId("queue-status").textContent =
      `File en attente : ${pendingCount}${errorsCount ? ` · ${errorsCount} à vérifier` : ""}`;
    byId("connection-status").textContent = navigator.onLine
      ? "Connexion disponible"
      : "Hors ligne";
    byId("connection-status").className = `status${navigator.onLine ? "" : " offline"}`;
    byId("prepared-at").textContent = snapshot
      ? `Listes préparées le ${new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(snapshot.preparedAt))}. ${snapshot.limitedDeliveries ? "Les 500 derniers apports à traiter sont chargés." : ""}`
      : "Aucune préparation locale. Connectez-vous et actualisez les listes avant de travailler hors ligne.";

    if (!snapshot) {
      byId("collector-select").replaceChildren();
      byId("delivery-select").replaceChildren();
      byId("integration-select").replaceChildren();
      byId("plastic-select").replaceChildren();
    } else {
      const data = await getVisibleData();
      addOptions(
        byId("collector-select"),
        data.collectors,
        (row) => `${row.name}${row.isLocal ? " · local" : ""}`,
        "Choisir un collecteur",
      );
      addOptions(
        byId("delivery-select"),
        data.deliveries.filter((row) => row.status === "recue"),
        (row) =>
          `${row.collectorName} · ${dateLabel(row.deliveryDate)} · ${row.receivedKg} kg${row.isLocal ? " · local" : ""}`,
        "Choisir un apport reçu",
      );
      addOptions(
        byId("integration-select"),
        data.deliveries.filter((row) => row.status === "triee"),
        (row) =>
          `${row.collectorName} · ${row.acceptedKg} kg acceptés${row.isLocal ? " · local" : ""}`,
        "Choisir un apport trié",
      );
      addOptions(
        byId("plastic-select"),
        data.materialStock.filter((row) => row.quantityKg > 0),
        (row) =>
          `${row.plasticType} · ${Number(row.quantityKg).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg disponibles`,
        "Choisir un plastique en stock",
      );
      byId("stock-summary").textContent = data.materialStock.length
        ? `Stock provisoire après les saisies locales : ${data.materialStock
            .map(
              (row) =>
                `${row.plasticType} ${Number(row.quantityKg).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} kg`,
            )
            .join(" · ")}. Les fabrications seront vérifiées avec le stock serveur lors de la synchronisation.`
        : "Aucun stock matière positif dans la dernière préparation.";
      if (data.deliveries.length === 500) {
        setFeedback(
          "La préparation a atteint la limite de 500 apports à traiter. Synchronisez les saisies et actualisez les listes avant de continuer.",
          "error",
        );
      }
    }

    const list = byId("queue-list");
    list.replaceChildren();
    const displayed = [...activeQueue].reverse();
    if (otherAccountCount > 0) {
      const warning = document.createElement("p");
      warning.className = "feedback error";
      warning.textContent = `${otherAccountCount} saisie(s) locale(s) appartiennent à un autre compte; elles ne seront ni affichées ni synchronisées avec ce compte.`;
      list.append(warning);
    }
    if (!displayed.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Aucune saisie en attente.";
      list.append(empty);
    }
    for (const record of displayed) {
      const item = record.payload;
      const label = {
        collecteur: `Nouveau collecteur · ${item.name}`,
        apport: `Apport · ${item.plasticType} · ${item.receivedKg} kg`,
        tri: `Tri · ${item.acceptedKg} kg acceptés`,
        integration: "Intégration au stock matière",
        production: `Fabrication · ${item.broomsProduced} balais`,
      }[item.type];
      const stateLabel = {
        pending: "En attente",
        syncing: "Synchronisation…",
        error: record.error || "À vérifier",
        synced: "Synchronisée",
      }[record.state];
      const entry = document.createElement("div");
      entry.className = "item";
      entry.innerHTML =
        `<p><strong>${escapeHtml(label)}</strong></p>` +
        `<p class="muted small">${escapeHtml(stateLabel)} · ${escapeHtml(new Date(record.createdAt).toLocaleString("fr-FR"))}</p>`;
      if (record.state === "error") {
        const actions = document.createElement("div");
        actions.className = "row";
        const retry = document.createElement("button");
        retry.className = "secondary";
        retry.type = "button";
        retry.textContent = "Réessayer";
        retry.addEventListener("click", async () => {
          record.state = "pending";
          record.error = "";
          await saveRecord(record);
          await render();
          await syncQueue();
        });
        const remove = document.createElement("button");
        remove.className = "danger";
        remove.type = "button";
        remove.textContent = "Supprimer cette saisie";
        remove.addEventListener("click", async () => {
          if (
            window.confirm(
              "Supprimer définitivement cette saisie locale refusée ? Cette action ne peut pas être annulée.",
            )
          ) {
            await removeRecord(record.id);
            await render();
          }
        });
        actions.append(retry, remove);
        entry.append(actions);
      }
      list.append(entry);
    }
  }

  async function fetchAndSaveSnapshot(showMessage) {
    if (!navigator.onLine) {
      if (showMessage) {
        setFeedback(
          "Vous êtes hors ligne. Les dernières listes préparées sur cet appareil seront utilisées.",
          "error",
        );
      }
      return false;
    }
    let response;
    try {
      response = await fetch("/api/offline/bootstrap", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
    } catch {
      if (showMessage) {
        setFeedback(
          "Impossible de joindre le serveur. Les listes locales et saisies en attente sont conservées.",
          "error",
        );
      }
      return false;
    }
    let result;
    try {
      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("application/json")) {
        setFeedback(
          "Votre session n’est pas disponible. Connectez-vous à l’application avec le compte ayant préparé cet espace, puis réessayez.",
          "error",
        );
        return false;
      }
      result = await response.json();
    } catch {
      result = null;
    }
    if (!response.ok) {
      const message = result && typeof result.error === "string"
        ? result.error
        : "Impossible de préparer les listes. Vérifiez votre session.";
      if (showMessage) {
        setFeedback(message, "error");
      }
      return false;
    }
    snapshot = result;
    await saveRecord({ id: SNAPSHOT_KEY, kind: "snapshot", ...result });
    const records = await readQueue();
    for (const record of records) {
      if (record.ownerId === snapshot.ownerId && record.state === "synced") {
        await removeRecord(record.id);
      }
    }
    if (showMessage) {
      setFeedback("Les listes sont actualisées et prêtes pour une coupure réseau.", "success");
    }
    await render();
    return true;
  }

  async function syncQueue() {
    if (syncing || !navigator.onLine || !snapshot) {
      return;
    }
    syncing = true;
    try {
      const queue = (await readQueue()).filter(
        (record) =>
          record.ownerId === snapshot.ownerId &&
          record.state !== "synced",
      );
      for (const record of queue) {
        if (record.state === "error") {
          break;
        }
        record.state = "syncing";
        await saveRecord(record);
        await render();
        let response;
        try {
          response = await fetch("/api/offline/sync", {
            method: "POST",
            cache: "no-store",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(record.payload),
          });
        } catch {
          record.state = "pending";
          record.error = "";
          await saveRecord(record);
          setFeedback(
            "La connexion a été interrompue. Les saisies restent enregistrées sur cet appareil.",
            "error",
          );
          break;
        }

        let result;
        try {
          result = await response.json();
        } catch {
          result = null;
        }
        if (!response.ok || !result || result.ok !== true) {
          record.state = "error";
          record.error =
            result && typeof result.error === "string"
              ? result.error
              : "La synchronisation a échoué. Reconnectez-vous, puis réessayez.";
          await saveRecord(record);
          setFeedback(record.error, "error");
          break;
        }

        record.state = "synced";
        record.error = "";
        record.message = result.message;
        await saveRecord(record);
        setFeedback(result.message, "success");
      }

      const remaining = (await readQueue()).some(
        (record) =>
          record.ownerId === snapshot.ownerId &&
          record.state !== "synced",
      );
      if (!remaining) {
        const refreshed = await fetchAndSaveSnapshot(false);
        if (!refreshed) {
          await render();
        }
      } else {
        await render();
      }
    } finally {
      syncing = false;
    }
  }

  async function enqueue(type, fields) {
    if (!snapshot) {
      throw new Error(
        "Préparez d’abord les listes en ligne. Les données du serveur ne sont pas disponibles sur cet appareil.",
      );
    }
    const id = crypto.randomUUID();
    const payload = {
      id,
      ownerId: snapshot.ownerId,
      type,
      ...fields,
    };
    const record = {
      id: queueId(id),
      kind: "queue",
      ownerId: snapshot.ownerId,
      createdAt: new Date().toISOString(),
      state: "pending",
      error: "",
      payload,
    };
    await saveRecord(record);
    await render();
    await syncQueue();
  }

  function values(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function showFormError(error) {
    setFeedback(
      error instanceof Error
        ? error.message
        : "La saisie n’a pas pu être conservée sur cet appareil.",
      "error",
    );
  }

  byId("collector-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const fields = values(form);
      if (fields.name.trim().length < 2) {
        throw new Error("Le nom du collecteur doit contenir au moins 2 caractères.");
      }
      await enqueue("collecteur", {
        name: fields.name,
        collectorType: fields.type,
        phone: fields.phone,
        zone: fields.zone,
        notes: fields.notes,
      });
      form.reset();
      setFeedback("Collecteur conservé sur l’appareil; synchronisation automatique lancée.", "success");
    } catch (error) {
      showFormError(error);
    }
  });

  byId("delivery-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const fields = values(form);
      if (!parseKg(fields.receivedKg) || parseKg(fields.receivedKg) <= 0) {
        throw new Error("Saisissez un poids valide supérieur à zéro.");
      }
      await enqueue("apport", fields);
      form.reset();
      byId("delivery-date").value = doualaDate();
      await render();
      setFeedback("Apport conservé sur l’appareil; synchronisation automatique lancée.", "success");
    } catch (error) {
      showFormError(error);
    }
  });

  byId("sorting-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const fields = values(form);
      const accepted = parseKg(fields.acceptedKg);
      const rejected = parseKg(fields.rejectedKg);
      const data = await getVisibleData();
      const delivery = data?.deliveries.find(
        (candidate) => candidate.id === fields.deliveryId,
      );
      if (!delivery || delivery.status !== "recue") {
        throw new Error("Choisissez un apport encore en attente de tri.");
      }
      if (
        accepted === null ||
        rejected === null ||
        grams(accepted) + grams(rejected) !== grams(parseKg(delivery.receivedKg))
      ) {
        throw new Error("Le poids accepté et rejeté doit correspondre exactement au poids reçu.");
      }
      if (rejected > 0 && !fields.rejectionReason.trim()) {
        throw new Error("Indiquez le motif si une partie de l’apport est rejetée.");
      }
      await enqueue("tri", fields);
      form.reset();
      await render();
      setFeedback("Tri conservé sur l’appareil; synchronisation automatique lancée.", "success");
    } catch (error) {
      showFormError(error);
    }
  });

  byId("integration-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const fields = values(form);
      const data = await getVisibleData();
      const delivery = data?.deliveries.find(
        (candidate) => candidate.id === fields.deliveryId,
      );
      if (!delivery || delivery.status !== "triee") {
        throw new Error("Choisissez un apport déjà trié et non encore intégré.");
      }
      await enqueue("integration", fields);
      form.reset();
      await render();
      setFeedback("Intégration conservée sur l’appareil; synchronisation automatique lancée.", "success");
    } catch (error) {
      showFormError(error);
    }
  });

  byId("production-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const fields = values(form);
      const used = parseKg(fields.materialUsedKg);
      const bands = parseKg(fields.bandsPreparedKg);
      const loss = parseKg(fields.lossKg);
      if (
        used === null ||
        bands === null ||
        loss === null ||
        used <= 0 ||
        grams(bands) + grams(loss) !== grams(used)
      ) {
        throw new Error("Le poids utilisé doit être égal aux bandes préparées plus les pertes.");
      }
      if (loss > 0 && !fields.lossReason.trim()) {
        throw new Error("Indiquez le motif des pertes.");
      }
      if (!/^\d{1,7}$/.test(fields.broomsProduced) || Number(fields.broomsProduced) <= 0) {
        throw new Error("Saisissez un nombre entier de balais supérieur à zéro.");
      }
      const data = await getVisibleData();
      const stock = data?.materialStock.find(
        (row) => row.plasticType === fields.plasticType,
      );
      if (!stock || Number(stock.quantityKg) < used) {
        throw new Error("Le stock provisoire est insuffisant pour cette fabrication.");
      }
      await enqueue("production", fields);
      form.reset();
      byId("production-date").value = doualaDate();
      await render();
      setFeedback("Fabrication conservée sur l’appareil; le stock sera contrôlé à la synchronisation.", "success");
    } catch (error) {
      showFormError(error);
    }
  });

  byId("refresh-data").addEventListener("click", async () => {
    try {
      if (await fetchAndSaveSnapshot(true)) {
        await syncQueue();
      }
    } catch {
      setFeedback(
        "Impossible de joindre le serveur. Les listes locales et saisies en attente sont conservées.",
        "error",
      );
    }
  });

  byId("clear-local").addEventListener("click", async () => {
    const queue = await readQueue();
    if (
      !window.confirm(
        `Effacer les listes locales et les ${queue.length} saisie(s) hors ligne sur cet appareil ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    for (const record of await readAllRecords()) {
      await removeRecord(record.id);
    }
    snapshot = null;
    await render();
    setFeedback("Les données locales ont été effacées de cet appareil.", "success");
  });

  byId("delivery-date").value = doualaDate();
  byId("production-date").value = doualaDate();
  window.addEventListener("online", async () => {
    await render();
    if (await fetchAndSaveSnapshot(false)) {
      await syncQueue();
    } else {
      await syncQueue();
    }
  });
  window.addEventListener("offline", render);
  window.addEventListener("focus", async () => {
    await syncQueue();
  });

  async function start() {
    try {
      database = await openDatabase();
      const saved = await readRecord(SNAPSHOT_KEY);
      if (saved) {
        snapshot = saved;
      }
      await render();
      if (navigator.onLine) {
        const refreshed = await fetchAndSaveSnapshot(false);
        if (!refreshed && !snapshot) {
          setFeedback(
            "Connectez-vous à l’application puis préparez les listes avant d’utiliser les fonctions hors ligne.",
            "error",
          );
        }
        await syncQueue();
      } else if (!snapshot) {
        setFeedback(
          "Aucune liste n’a encore été préparée sur cet appareil. Reconnectez-vous pour préparer l’espace hors ligne.",
          "error",
        );
      }
    } catch {
      setFeedback(
        "Le stockage hors ligne de ce navigateur est indisponible. Vérifiez les réglages du navigateur et réessayez.",
        "error",
      );
    }
  }

  start();
})();
