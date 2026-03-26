export type Screen = 'dashboard' | 'study' | 'refine' | 'chronicles';

export interface Marginalia {
  id: string;
  author: string;
  time: string;
  content: string;
  type: 'discovery' | 'observation' | 'goal';
}

export interface Chamber {
  id: string;
  name: string;
  location: string;
  image: string;
  scholars: number;
  description?: string;
  type: 'focus' | 'social' | 'creative';
}

export interface Artifact {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
}

export interface Garment {
  id: string;
  name: string;
  description: string;
  icon: string;
  selected: boolean;
}
