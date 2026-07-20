export interface ComponentDef {
  id: string;
  name: string;
  type: "electronics" | "mechanics" | "aerodynamics";
  description: string;
  parameters: Record<string, ParameterDef>;
}

export interface ParameterDef {
  type: string;
  unit: string;
  default: number | string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface PlacedComponent {
  instanceId: string;
  componentId: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  parameters: Record<string, number | string>;
}

export interface Wire {
  id: string;
  fromInstanceId: string;
  fromPin: number;
  toInstanceId: string;
  toPin: number;
}
