export type TaskType = "todo" | "note";

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  color: string;
}
export type TaskStatus = "pending" | "done";

export interface Member {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  motto: string;
  members: Member[];
  invite_code: string;
  created_at: string;
}

export interface Task {
  id: string;
  group_id: string;
  content: string;
  type: TaskType;
  assignee_id: string | null;
  assignee_name: string | null;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
  position_x: number;
  position_y: number;
  rotation: number;
  reactions: Record<string, number>;
  color: string | null;
}
