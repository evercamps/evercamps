export default function logoutUser(this: any) {
  this.session.userID = undefined;
  this.locals.user = undefined;
}
