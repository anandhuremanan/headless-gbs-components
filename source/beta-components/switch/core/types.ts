export type SwitchSize = "sm" | "md" | "lg";

/** Which side of the track the label sits on. */
export type SwitchLabelPosition = "end" | "start";

export interface SwitchLocaleText {
  /** Announced while a change is being saved. */
  saving: string;
}
