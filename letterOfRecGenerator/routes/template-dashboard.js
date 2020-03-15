var express = require('express');
var router = express.Router();
var db = require('../db')
var fs = require('fs')
var User = require('../models/user');

/* GET Templates page. */
router.get('/', function (req, res, next) {
    var currLetterTemplate = __dirname + '/uploads/' + 'letterTemplate';
    if(!fs.existsSync(currLetterTemplate)){
        currLetterTemplate = '';
    }

    // // Searching through session info to find User ID number
    // var sessionString = JSON.stringify(req.sessionStore.sessions);
    // var id_index = sessionString.search('id') + 7;
    // var id_index_lastNum = id_index + 24;
    // var userID = sessionString.slice(id_index, id_index_lastNum);
    //
    // User.findUser(userID, function (err, user) {
    //   if (err) {
    //     console.log('Error finding User.');
    //   } else {
    //     console.log('User is: ', user.email);
        res.render('pages/template-dashboard', {
            title: 'Templates',
            templates: user.getTemplates(),
            emailtemplates: user.getEmailTemplates(),
            letterTemplate: currLetterTemplate
        });

    //   }
    // });
});

router.post('/delete', function (req, res, next) {

  // // Searching through session info to find User ID number
  // var sessionString = JSON.stringify(req.sessionStore.sessions);
  // var id_index = sessionString.search('id') + 7;
  // var id_index_lastNum = id_index + 24;
  // var userID = sessionString.slice(id_index, id_index_lastNum);
  //
  // User.findUser(userID, function (err, user) {
  //   if (err) {
  //     console.log('Error finding User.');
  //   } else {

      req.user.deactivateTemplate(req.body.id, function (err) {
          if (err) {
              console.log(err);
          } else {
              res.render('pages/template-dashboard', {
                  title: 'Templates',
                  templates: req.user.getTemplates(),
                  emailtemplates: req.user.getEmailTemplates(),
              });
          }
      });
  //   }
  // });
});

router.post('/delete-email', function (req, res, next) {

  // // Searching through session info to find User ID number
  // var sessionString = JSON.stringify(req.sessionStore.sessions);
  // var id_index = sessionString.search('id') + 7;
  // var id_index_lastNum = id_index + 24;
  // var userID = sessionString.slice(id_index, id_index_lastNum);
  //
  // User.findUser(userID, function (err, user) {
  //   if (err) {
  //     console.log('Error finding User.');
  //   } else {

    req.user.deactivateEmailTemplate(req.body.id, function (err) {
        if (err) {
            console.log(err);
        } else {
            res.render('pages/template-dashboard', {
                title: 'Templates',
                templates: req.user.getTemplates(),
                emailtemplates: req.user.getEmailTemplates(),
            });
          }
      });
  //   }
  // });
});

router.post('/uploadLetterTemplate', function(req,res,next){
    console.log(req.files.file);
    // console.log(req)
    var file = req.files.file;

    var filePath = __dirname + '/uploads/' + 'letterTemplate';
    file.mv(filePath, function(err){
        if(err){
            return res.status(500).send(err);
        }
    });

    console.log("about to print file;");
    console.log(file);

})

module.exports = router;
