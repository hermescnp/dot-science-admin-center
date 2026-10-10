export interface FeatureSubtask {
  id: string;
  /** `platform_features.id` of the parent feature. */
  featureId: string;
  title: string;
  done: boolean;
  position: number;
}

export interface FeatureSubtaskCreatePayload {
  featureId: string;
  title: string;
}

export interface FeatureSubtaskUpdatePayload {
  title?: string;
  done?: boolean;
}
