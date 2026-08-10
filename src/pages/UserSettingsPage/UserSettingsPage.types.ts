export interface UserSettingsDraft {
  profile: {
    fullName: string;
    avatarUrl: string;
  };
  academicProfile: {
    university: string;
    department: string;
    studyYear: string;
  };
  collaborationProfile: {
    skills: string;
    learningGoals: string;
    availability: string;
    taskPreferences: string;
  };
  notifications: {
    deadlineReminders: boolean;
    taskActivityNotifications: boolean;
  };
  links: {
    googleDrive: string;
    github: string;
    linkedin: string;
    portfolio: string;
  };
}
