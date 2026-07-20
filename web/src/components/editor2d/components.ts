import { ComponentDef } from "./types";

export const AVAILABLE_COMPONENTS: ComponentDef[] = [
  {
    id: "battery",
    name: "Battery",
    type: "electronics",
    description: "DC voltage source",
    parameters: {
      voltage: { type: "number", unit: "V", default: 9, min: 1.2, max: 48 },
    },
  },
  {
    id: "resistor",
    name: "Resistor",
    type: "electronics",
    description: "Limits current flow",
    parameters: {
      resistance_ohms: {
        type: "number",
        unit: "\u03a9",
        default: 1000,
        min: 0.1,
        max: 10000000,
      },
    },
  },
  {
    id: "led",
    name: "LED",
    type: "electronics",
    description: "Light emitting diode",
    parameters: {
      forward_voltage: { type: "number", unit: "V", default: 2.2, min: 1.2, max: 4.5 },
      forward_current: {
        type: "number",
        unit: "A",
        default: 0.02,
        min: 0.001,
        max: 0.05,
      },
    },
  },
  {
    id: "capacitor",
    name: "Capacitor",
    type: "electronics",
    description: "Stores electrical energy",
    parameters: {
      capacitance_farads: {
        type: "number",
        unit: "F",
        default: 1e-6,
        min: 1e-12,
        max: 1,
      },
    },
  },
  {
    id: "inductor",
    name: "Inductor",
    type: "electronics",
    description: "Stores energy in magnetic field",
    parameters: {
      inductance_henrys: {
        type: "number",
        unit: "H",
        default: 0.01,
        min: 1e-6,
        max: 10,
      },
    },
  },
  {
    id: "switch",
    name: "Switch",
    type: "electronics",
    description: "Opens or closes a circuit",
    parameters: {
      state: {
        type: "string",
        unit: "",
        default: "open",
        options: ["open", "closed"],
      },
    },
  },
];
