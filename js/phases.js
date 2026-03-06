/**
 * phases.js — Single Source of Truth for DevOps Roadmap Phase Definitions
 *
 * Used by:
 *   - dashboard.html      (loaded via <script src="phases.js"> → global PHASES)
 *   - .github/scripts/weekly-snapshot.js  (loaded via require('../../phases.js'))
 *
 * To add tasks or adjust day ranges → edit ONLY this file.
 */

// eslint-disable-next-line no-var
var PHASES = [
  { id: 'phase1',  label: 'Phase 1',   name: 'Linux & CLI Foundations',  dayStart: 1,   dayEnd: 21,  total: 250 },
  { id: 'phase2',  label: 'Phase 2',   name: 'Git & Version Control',    dayStart: 22,  dayEnd: 28,  total: 40  },
  { id: 'phase3',  label: 'Phase 3',   name: 'Bash Scripting',           dayStart: 29,  dayEnd: 35,  total: 61  },
  { id: 'phase4',  label: 'Phase 4',   name: 'Python for DevOps',        dayStart: 36,  dayEnd: 56,  total: 148 },
  { id: 'phase5',  label: 'Phase 5',   name: 'AWS Core',                 dayStart: 57,  dayEnd: 91,  total: 130 },
  { id: 'phase6',  label: 'Phase 6',   name: 'Jenkins & CI/CD',          dayStart: 92,  dayEnd: 112, total: 89  },
  { id: 'phase7',  label: 'Phase 7',   name: 'Docker',                   dayStart: 113, dayEnd: 140, total: 100 },
  { id: 'phase7b', label: 'Phase 7b',  name: 'Kubernetes',               dayStart: 141, dayEnd: 175, total: 130 },
  { id: 'phase8',  label: 'Phase 8',   name: 'Ansible',                  dayStart: 176, dayEnd: 196, total: 70  },
  { id: 'phase9',  label: 'Phase 9',   name: 'Terraform',                dayStart: 197, dayEnd: 217, total: 70  },
  { id: 'phase10', label: 'Phase 10',  name: 'GitHub Actions',           dayStart: 218, dayEnd: 224, total: 35  },
  { id: 'phase11', label: 'Phase 11',  name: 'GitLab CI',                dayStart: 225, dayEnd: 231, total: 30  },
  { id: 'phase12', label: 'Phase 12',  name: 'GCP',                      dayStart: 232, dayEnd: 238, total: 30  },
  { id: 'phase13', label: 'Phase 13',  name: 'Capstone & Projects',      dayStart: 239, dayEnd: 245, total: 30  },
];

// Node.js / CommonJS support (GitHub Actions script)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PHASES;
}
