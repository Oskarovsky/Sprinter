export const site = {
  name: "10xSprinter",
  tagline: "Planning poker for Scrum teams",
  supportEmail: "support@10xsprinter.example",
  githubRepo: "https://github.com/Oskarovsky/Sprinter",
  owners: [
    {
      name: "Oskarovsky",
      role: "Project maintainer",
    },
  ],
} as const;

export const supportLinks = {
  email: `mailto:${site.supportEmail}`,
  issues: `${site.githubRepo}/issues`,
} as const;
