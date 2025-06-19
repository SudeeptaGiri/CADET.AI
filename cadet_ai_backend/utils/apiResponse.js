/**
 * Standard API response format
 */
class ApiResponse {
  /**
   * Create a standardized API response
   * @param {boolean} success - Whether the request was successful
   * @param {*} data - The data to return
   * @param {string} message - A message describing the response
   */
  constructor(success, data, message) {
    this.success = success;
    this.data = data;
    this.message = message;
  }
}

module.exports = ApiResponse;