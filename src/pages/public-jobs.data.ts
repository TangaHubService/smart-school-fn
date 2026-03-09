import airtelLogo from '../asset/airtel.png';
import basgoLogo from '../asset/basgo.png';
import momoPayLogo from '../asset/momopay.jpg';
import rayonSportLogo from '../asset/rayonSport.png';

export interface PublicJob {
  id: string;
  slug: string;
  title: string;
  company: string;
  category: string;
  postedAt: string;
  dueDate: string;
  location: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  companyLogo?: string;
  companyWebsite?: string;
  applicationLink?: string;
}

export const publicJobs: PublicJob[] = [
  {
    id: 'job-001',
    slug: 'academic-program-coordinator',
    title: 'Academic Program Coordinator',
    company: 'Smart School Rwanda',
    category: 'Education',
    postedAt: '2026-03-01',
    dueDate: '2026-03-22',
    location: 'Kigali, Rwanda',
    description:
      'Lead day-to-day coordination of learning tracks, student schedules, and trainer communications across Smart School programs.',
    responsibilities: [
      'Coordinate weekly learning calendars and assessment schedules.',
      'Track student participation and program completion metrics.',
      'Work with content and operations teams to improve delivery quality.',
      'Prepare monthly progress updates for internal leadership.',
    ],
    requirements: [
      'Bachelor degree in education, social sciences, or related field.',
      'Strong communication and planning skills.',
      'Experience in school, training, or NGO education operations.',
      'Good command of Google Workspace or Microsoft Office.',
    ],
    companyLogo: basgoLogo,
    companyWebsite: 'https://smartschool.rw',
    applicationLink: 'mailto:smartschoolrwanda@gmail.com?subject=Application%20-%20Academic%20Program%20Coordinator',
  },
  {
    id: 'job-002',
    slug: 'school-operations-officer',
    title: 'School Operations Officer',
    company: 'Smart School Rwanda',
    category: 'Administration',
    postedAt: '2026-02-28',
    dueDate: '2026-03-20',
    location: 'Nyanza, Rwanda',
    description:
      'Support operational execution across onboarding, support coordination, and internal school process documentation.',
    responsibilities: [
      'Handle day-to-day office coordination and stakeholder follow-up.',
      'Maintain operational records and reporting templates.',
      'Support onboarding activities for partner schools.',
      'Coordinate logistics for workshops and implementation sessions.',
    ],
    requirements: [
      'Bachelor degree in business administration, management, or related area.',
      'At least 2 years of administrative or operations experience.',
      'Detail-oriented with excellent organizational discipline.',
      'Ability to work with multiple teams and priorities.',
    ],
    companyLogo: airtelLogo,
    companyWebsite: 'https://smartschool.rw',
    applicationLink: 'mailto:smartschoolrwanda@gmail.com?subject=Application%20-%20School%20Operations%20Officer',
  },
  {
    id: 'job-003',
    slug: 'learning-content-specialist',
    title: 'Learning Content Specialist',
    company: 'Smart School Rwanda',
    category: 'Content',
    postedAt: '2026-03-03',
    dueDate: '2026-03-25',
    location: 'Kigali, Rwanda',
    description:
      'Design and review practical learning materials that align with Rwanda labor market needs and classroom implementation.',
    responsibilities: [
      'Develop course outlines, lesson plans, and practical exercises.',
      'Review and update existing course content for quality and clarity.',
      'Collaborate with subject experts to ensure relevance and accuracy.',
      'Support digital publishing of content on the platform.',
    ],
    requirements: [
      'Background in curriculum design, education, or instructional development.',
      'Strong writing and editing ability in English.',
      'Comfortable using digital learning tools and LMS platforms.',
      'Demonstrated ability to transform technical topics into practical lessons.',
    ],
    companyLogo: momoPayLogo,
    companyWebsite: 'https://smartschool.rw',
    applicationLink: 'mailto:smartschoolrwanda@gmail.com?subject=Application%20-%20Learning%20Content%20Specialist',
  },
  {
    id: 'job-004',
    slug: 'platform-support-associate',
    title: 'Platform Support Associate',
    company: 'Smart School Rwanda',
    category: 'Technology',
    postedAt: '2026-03-04',
    dueDate: '2026-03-24',
    location: 'Kigali, Rwanda',
    description:
      'Provide first-line platform support to schools, troubleshoot user issues, and document recurring improvement opportunities.',
    responsibilities: [
      'Respond to user tickets and onboarding questions quickly.',
      'Investigate and escalate technical incidents to engineering.',
      'Create simple help resources for school users.',
      'Track issue trends and suggest product improvements.',
    ],
    requirements: [
      'Technical diploma or degree in IT, information systems, or related field.',
      'Experience in software support, helpdesk, or system administration.',
      'Clear communication in English and Kinyarwanda.',
      'Ability to prioritize issues and deliver timely updates.',
    ],
    companyLogo: rayonSportLogo,
    companyWebsite: 'https://smartschool.rw',
    applicationLink: 'mailto:smartschoolrwanda@gmail.com?subject=Application%20-%20Platform%20Support%20Associate',
  },
  {
    id: 'job-005',
    slug: 'community-engagement-assistant',
    title: 'Community Engagement Assistant',
    company: 'Smart School Rwanda',
    category: 'Community',
    postedAt: '2026-02-27',
    dueDate: '2026-03-21',
    location: 'Nyanza, Rwanda',
    description:
      'Strengthen relationships with partner schools and communities through outreach, event support, and communication follow-up.',
    responsibilities: [
      'Coordinate outreach with schools, parents, and local stakeholders.',
      'Support awareness campaigns and public events.',
      'Collect field feedback and relay insights to internal teams.',
      'Assist with communication materials and engagement reports.',
    ],
    requirements: [
      'Background in communications, education, or social sciences.',
      'Strong interpersonal and facilitation skills.',
      'Ability to travel for school outreach activities.',
      'Comfortable using digital communication tools.',
    ],
    companyLogo: basgoLogo,
    companyWebsite: 'https://smartschool.rw',
    applicationLink: 'mailto:smartschoolrwanda@gmail.com?subject=Application%20-%20Community%20Engagement%20Assistant',
  },
];

export const publicJobCategories = [
  'All Jobs',
  ...new Set(publicJobs.map((job) => job.category)),
];

export function findPublicJobBySlug(slug: string) {
  return publicJobs.find((job) => job.slug === slug);
}

export function formatPublicJobDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
