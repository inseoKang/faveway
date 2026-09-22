export type DocentLanguage = "ko" | "en";

export type DocentActor = {
  id: number;
  name: string;
};

export type DocentScene = {
  id: number;
  episode: string | null;
  description: string | null;
  actors: DocentActor[];
};

export type DocentEvidence = {
  // Only PUBLIC_DATA facts enter the generation context.
  verificationStatus: "PUBLIC_DATA";
  sourceType: string | null;
  verifiedFact: string;
};

export type PlaceDocentContext = {
  content: {
    id: number;
    title: string;
  };

  place: {
    id: number;
    name: string;
    address: string | null;
  };

  scenes: DocentScene[];

  evidence: DocentEvidence[];
};

export type PlaceDocentRequest = {
  contentId: number;
  placeId: number;
  language: DocentLanguage;
};

export type CourseDocentStopRequest = {
  contentId: number;
  placeId: number;
  order: number;
};

export type CourseDocentRequest = {
  stops: CourseDocentStopRequest[];
  language: DocentLanguage;
};

export type GeneratedDocent = {
  title: string;
  narration: string;
};

export type PlaceDocentResponse = {
  type: "place";
  contentId: number;
  placeId: number;
  language: DocentLanguage;
  title: string;
  narration: string;
  generatedFrom: {
    sceneIds: number[];
    hasVerifiedFact: boolean;
  };
};

export type CourseDocentResponse = {
  type: "course";
  language: DocentLanguage;
  title: string;
  narration: string;
  generatedFrom: {
    stops: {
      contentId: number;
      placeId: number;
      order: number;
      sceneIds: number[];
      hasVerifiedFact: boolean;
    }[];
  };
};
