export default (request: any, response: any) => {
  request.isAdmin = true;
  response.context.isAdmin = true;
};