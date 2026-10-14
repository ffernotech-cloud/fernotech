const { execFileSync } = require("node:child_process");

const repository = "D:\\Projets applications\\fernotech-eco-track";
const git = (args) =>
  execFileSync("C:\\Program Files\\Git\\cmd\\git.exe", args, {
    cwd: repository,
    stdio: "inherit",
  });

git(["add", "-A"]);
git(["diff", "--cached", "--check"]);
git([
  "commit",
  "-m",
  "Ajoute le module Collecteurs",
  "-m",
  "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>",
]);
git(["push", "origin", "main"]);
