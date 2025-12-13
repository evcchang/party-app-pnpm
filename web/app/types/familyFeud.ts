export type FeudRound = {
    id: string;
    question: string;
    strikes: number;
    active: boolean;
  };
  
  export type FeudAnswer = {
    id: string;
    round_id: string;
    answer: string;
    points: number;
    revealed: boolean;
  };
  