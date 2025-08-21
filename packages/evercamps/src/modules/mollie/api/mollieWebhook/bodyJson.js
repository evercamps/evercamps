import bodyParser from 'body-parser';

export default (request, response, next) => {
  bodyParser.urlencoded({ extended: true })(request, response, next);
};

