export class ApiResponse<T> {
  success!: boolean
  data?: T
  error?: string

  static ok<T>(data?: T): ApiResponse<T> {
    return { success: true, data }
  }

  static fail(error: string): ApiResponse<never> {
    return { success: false, error }
  }
}
