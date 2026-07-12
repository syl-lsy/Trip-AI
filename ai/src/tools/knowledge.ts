export interface KnowledgeResult {
  id: string
  title: string
  summary: string
  category: string
  similarity: number
}

export class KnowledgeTool {
  // eslint-disable-next-line no-magic-numbers
  async search(_query: string, _topK = 5): Promise<KnowledgeResult[]> {
    return []
  }
}
