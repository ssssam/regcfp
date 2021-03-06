var express = require('express');
var router = express.Router();

var models = require('../models');
var User = models.User;
var Registration = models.Registration;
var RegistrationPayment = models.RegistrationPayment;

var config = require('../configuration');

var utils = require('../utils');


/* GET home page. */
router.get('/', function(req, res, next) {
  if(req.session.currentUser)
  {
    if(req.user) {
      req.user.getRegistration({include: [RegistrationPayment]})
      .then(function(reg) {
        res.render('index/index', { name: req.user.name, registration: reg });
      });
    } else {
      res.render('index/index', { name: req.session.currentUser });
    }
  } else {
    res.render('index/index', { });
  }
});

module.exports = router;
