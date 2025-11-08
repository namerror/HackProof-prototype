import { ParticipantMetadata, ProjectMetadata, AchievementMetadata } from '../types/nft-metadata';

export function createParticipantMetadata(
  name: string,
  imageCid: string,
  options?: {
    school?: string;
    year?: string;
    skills?: string[];
  }
): ParticipantMetadata {
  const attributes = [];
  if (options?.school) {
    attributes.push({ trait_type: 'School', value: options.school });
  }
  if (options?.year) {
    attributes.push({ trait_type: 'Year', value: options.year });
  }
  if (options?.skills && options.skills.length > 0) {
    attributes.push({ trait_type: 'Skills', value: options.skills.join(', ') });
  }

  return {
    name: `HackProof Participant: ${name}`,
    description: `Verified participant in HackProof hackathon`,
    image: `https://${imageCid}.ipfs.nftstorage.link`,
    attributes,
    properties: {
      category: 'participant',
      school: options?.school,
      year: options?.year,
      skills: options?.skills,
    },
  };
}

export function createProjectMetadata(
  name: string,
  description: string,
  imageCid: string,
  teamMembers: string[],
  options?: {
    githubRepo?: string;
    demoUrl?: string;
  }
): ProjectMetadata {
  const attributes = [
    { trait_type: 'Team Size', value: teamMembers.length },
    { trait_type: 'Team Members', value: teamMembers.join(', ') },
  ];

  if (options?.githubRepo) {
    attributes.push({ trait_type: 'GitHub', value: options.githubRepo });
  }

  if (options?.demoUrl) {
    attributes.push({ trait_type: 'Demo URL', value: options.demoUrl });
  }

  return {
    name: `HackProof Project: ${name}`,
    description,
    image: `https://${imageCid}.ipfs.nftstorage.link`,
    attributes,
    properties: {
      category: 'project',
      teamMembers,
      githubRepo: options?.githubRepo,
      demoUrl: options?.demoUrl,
    },
  };
}

export function createAchievementMetadata(
  type: string,
  description: string,
  imageCid: string,
  awardedAt: string
): AchievementMetadata {
  return {
    name: `HackProof Achievement: ${type}`,
    description,
    image: `https://${imageCid}.ipfs.nftstorage.link`,
    attributes: [
      { trait_type: 'Type', value: type },
      { trait_type: 'Awarded At', value: awardedAt },
    ],
    properties: {
      category: 'achievement',
      type,
      awardedAt,
    },
  };
}

