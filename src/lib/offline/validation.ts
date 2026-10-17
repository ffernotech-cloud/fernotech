import { z } from "zod";
import {
  createCollectorSchema,
  createDeliverySchema,
} from "@/lib/collectors/validation";
import {
  createProductionSchema,
} from "@/lib/production/validation";
import {
  integrateDeliverySchema,
  sortDeliverySchema,
} from "@/lib/sorting/validation";

const ownerAndId = {
  id: z.uuid("Identifiant de saisie hors ligne invalide."),
  ownerId: z.uuid("Identifiant utilisateur invalide."),
};

export const offlineSubmissionSchema = z.discriminatedUnion("type", [
  z.object({
    ...ownerAndId,
    type: z.literal("collecteur"),
    ...createCollectorSchema.omit({ type: true }).shape,
    collectorType: createCollectorSchema.shape.type,
  }),
  z.object({
    ...ownerAndId,
    type: z.literal("apport"),
    ...createDeliverySchema.shape,
  }),
  z.object({
    ...ownerAndId,
    type: z.literal("tri"),
    ...sortDeliverySchema.shape,
  }),
  z.object({
    ...ownerAndId,
    type: z.literal("integration"),
    ...integrateDeliverySchema.shape,
  }),
  z.object({
    ...ownerAndId,
    type: z.literal("production"),
    ...createProductionSchema.shape,
  }),
]);

export type OfflineSubmission = z.infer<typeof offlineSubmissionSchema>;
