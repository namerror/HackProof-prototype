export interface ParticipantMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: "participant";
    school?: string;
    year?: string;
    skills?: string[];
  };
}

export interface ProjectMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: "project";
    teamMembers: string[];
    githubRepo?: string;
    demoUrl?: string;
  };
}

export interface AchievementMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: "achievement";
    type: string;
    awardedAt: string;
  };
}

