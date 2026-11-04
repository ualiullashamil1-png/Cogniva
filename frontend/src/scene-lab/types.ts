export interface ParamSpec {
  key: string
  label: string
  unit: string
  default: number
  min: number
  max: number
  step: number
}

export interface SceneData {
  template_id: string
  title: string
  physics_model: string
  object: { id: string; name: string; category: string; scale: number }
  components: string[]
  interactions: string[]
  parameters: Record<string, number>
  parameter_specs: ParamSpec[]
  restrictions: string[]
  notices: string[]
  physics: { assumptions?: string[] }
}

export interface Catalog {
  templates: { id: string; title: string; components: string[] }[]
  objects: { id: string; name: string; templates: string[] }[]
  components: { id: string; label: string }[]
}

export interface LessonData {
  id: number
  topic_id: number
  mode: string
  note: string | null
  plan: {
    rationale: string
    approaches: string[]
    steps: { title: string; content: string; approach: string }[]
    checkpoints: { question: string; hint: string }[]
  }
  messages: { role: string; content: string; mode?: string }[]
  scene: SceneData
}
export interface TestQuestionView {
  id: number
  number: number
  qtype: 'choice' | 'numeric' | 'text'
  text: string
  options: string[]
  unit: string
  graph: { type: string; x_label: string; y_label: string; points: number[][] } | null
}

export interface TestState {
  test_id: number
  kind: string
  status: string
  total: number
  answered: number
  question: TestQuestionView | null
}

export interface SubOutcome {
  key: string
  name: string
  pre: { correct: number; total: number; accuracy: number } | null
  post: { correct: number; total: number; accuracy: number } | null
  mastery_before: number | null
  mastery_after: number | null
  delta: number | null
  status: 'improved' | 'same' | 'declined' | 'no_data'
  misconceptions: { key: string; label: string; count: number }[]
}

export interface Outcome {
  state: 'ready' | 'waiting_post'
  has_pre: boolean
  has_post: boolean
  pre_score: number | null
  post_score: number | null
  subtopics: SubOutcome[]
  improved: string[]
  remaining_weak: string[]
  recommendation: string
  caveat: string
}
export interface Progress {
  mastery: number | null
  assessed: boolean
  tasks_done: number
  difficulties: string[]
  recommendation: string
}
export interface SubtopicNode { id: number; name: string; description: string; key: string; progress: Progress }
export interface TopicNode { id: number; name: string; subtopics: SubtopicNode[] }
export interface SubjectNode { id: number; name: string; topics: TopicNode[] }

export interface AttentionItem {
  subtopic_id: number
  name: string
  topic: string
  subject: string
  mastery: number
  difficulties: string[]
}

export interface Overview {
  student: { id: number; display_name: string; grade_level: number }
  subjects: {
    id: number
    name: string
    grades_count: number
    avg_grade_percent: number | null
    avg_mastery: number | null
    assessed_subtopics: number
  }[]
  strongest: AttentionItem[]
  needs_attention: AttentionItem[]
  grade_history: { id: number; subject_id: number; percent: number; title: string; date: string }[]
  recent_grades: { id: number; subject_id: number; score: number; max_score: number; title: string }[]
}