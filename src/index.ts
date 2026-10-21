import { Composer, Dodgeball, useComposer, useDodgeball } from "./Composer";
import { LogLevel } from "./logger";
import {
  ComposerApiVersion,
  DodgeballApiVersion,
  IVerification,
  IComposerConfig,
  IDodgeballConfig,
} from "./types";

if (typeof window !== "undefined") {
  if (!window.hasOwnProperty("Composer")) {
    window.Composer = Composer;
  }
  if (!window.hasOwnProperty("Dodgeball")) {
    window.Dodgeball = Composer;
  }
}

export {
  Composer,
  ComposerApiVersion,
  LogLevel,
  useComposer,
  Dodgeball,
  DodgeballApiVersion,
  useDodgeball,
};

export type { IVerification, IComposerConfig, IDodgeballConfig };
