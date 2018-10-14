var db = require('../db');
var Link = require('./link');
var User = require('./user');
var Template = require('./template');


var Schema = db.Schema;

var FormSchema = new Schema({
    email: String,
    status: {
        type: String,
        enum: ['Sent', 'Submitted', 'Complete']
    },
    template: Template.schema,
    link: Link.schema,
    responses: [{
        tag: String,
        response: Schema.Types.Mixed,
    }],
    meta: {
        sent: Date,
        submitted: Date,
        completed: Date
    },
    letter: String,
    duplicated: Boolean,
    organization: String,
    owner: {type: db.Schema.Types.ObjectId, ref: 'User'}
});


FormSchema.methods.getResponses = function () {
    return this.responses;
};

/**
 * Creates a new form and initializes values
 * @param email Students email address
 * @param template
 * @param cb
 */
FormSchema.statics.createForm = function (email, template, userId, cb) {
    Link.generateLink(email, function (err, link) {
        if (err) {
            cb(err, null);
        } else {
            Form.create({
                email: email,
                status: 'Sent',
                template: template,
                link: link,
                'meta.sent': Date.now(),
                duplicated: false,
                organization: "unspecified",
                owner: userId
            }, cb);
        }
    });
};

FormSchema.statics.findForm = function (id, cb) {
    Form.findOne({_id: id}, cb);
};

FormSchema.statics.findFromLink = function (link, cb) {
    Form.findOne({'link.link': link}, cb);
};

FormSchema.statics.removeForm = function (id, cb) {
    FormSchema.statics.findForm(id, function (err, form) {
        if (err) {
            cb(err, null);
        } else {
            Link.removeLink(form.link.getId(), function (err) {
                if (err) {
                    cb(err, null);
                } else {
                    Form.remove({_id: id}, cb);
                }
            });
        }
    });
};

FormSchema.methods.getLink = function () {
    return this.link.link;
};

FormSchema.methods.getSent = function () {
    return this.meta.sent.toLocaleString('en-US');
};

FormSchema.methods.isSubmitted = function () {
    return this.status == 'Submitted';
};

FormSchema.methods.getSubmitted = function () {
    return this.meta.submitted.toLocaleString('en-US');
};

FormSchema.methods.getTemplate = function () {
    return this.template;
};

/**
 * Setter for organization
 * @param organization
 */
FormSchema.methods.setOrganization = function (organization) {
    this.organization = organization;
    this.save();
};

/**
 * Happens when student submits his/her response. 
 * Receives the response, updates the response in the form,
 * check if there are multiple organizations, and if there are,
 * create duplicates with seperate organization names and 
 * add the form._id to the correct owner (user).
 * @param id - id of form
 * @param responseData - responseData collected from the submitted response
 * @param cb
 */
FormSchema.statics.submitForm = function (id, responseData, cb) {
    var organizationArr = [];
    var savedFormIdArr = [];

    let totalForms = 0;
    let fieldsByForm = [];
    FormSchema.statics.findForm(id, function (err, form) {
        if (err) {
            cb("error in FormSchema.statics.submitForm / .findForm " + err, null);
        } else {
            var responses = [];
            form['template']['questions'].forEach(function (question) {
                var response = responseData[question.number - 1];
                /* If the question has a organizationFlag that is true, 
                attempt to extract the organizations (seperated with , )
                and make additional Forms with the different organization names */
                if(question.organizationFlag){
                    let organizationList = response.trim();
                    organizationArr = organizationList.split(", ");
                    response = organizationArr[0]; //update response to right organization
                    totalForms = organizationArr.length;
                }
                //If response is empty
                if (!response.length) {
                    responses.push({
                        tag: question.tag,
                        response: ''
                    });
                } else if (!(response instanceof Array)) {
                    //other response types are from here
                    responses.push({
                        tag: question.tag,
                        response: response
                    });
                } else if (question.type === "Custom") { // custom
                    let questionOptions = question.options;

                    let allFields = [];
                    for(let i=0; i<questionOptions.length; i++) {
                        let field = {
                            fieldName: questionOptions[i].option, // University
                            fieldTag: questionOptions[i].tag // <!Uni>
                        };
                        allFields.push(field);
                    }

                    // num organizations = len / number of options
                    let numResponse = response.length;
                    let numOptions = questionOptions.length;
                    let numOrganizations = numResponse / numOptions;
                    for(let k=0; k<numOrganizations; k++) {
                        fieldsByForm[k] = {
                            num: k,
                            fields: []
                        };
                    }

                    let i = 0;
                    response.forEach(function (optionText) {
                        // i can be calculated -- hack-y
                        let formIndex = Math.floor(i/numOptions);
                        let optionIndex = i % numOptions;
                        let field = {
                            fieldName: allFields[optionIndex].fieldName,
                            fieldTag: allFields[optionIndex].fieldTag,
                            response: optionText
                        };
                        fieldsByForm[formIndex].fields.push(field);

                        for(let k = 0; k<fieldsByForm.length; k++) {
                            console.log("form k: " + k);
                            console.log(fieldsByForm[k].fields);
                        }
                        i++;
                    });
                }
                else { // checkbox (?)
                    response.forEach(function (optionText) {
                        var option = question.options.find(function (option) {
                            return option.fill === optionText;
                        });

                        console.log("option: ");
                        console.log(option);

                        responses.push({
                            tag: option.tag,
                            response: option.fill
                        });

                        console.log("resposne: ");
                        console.log(responses);
                    });
                }
            });

            //Update organization to be the first one
            form.organization = organizationArr[0];
            form.duplicated = true;
            form.status = 'Submitted';

            form['meta']['submitted'] = Date.now();

            // set responses form 0th
            let allFieldsInForm = fieldsByForm[0].fields;
            for(let k=0; k<allFieldsInForm.length; k++) {
                responses.push({
                    tag: allFieldsInForm[k].fieldTag,
                    response: allFieldsInForm[k].response
                });
            }
            form['responses'] = responses;
            form.save().then(function(savedForm){
                if(organizationArr.length > 1){
                    for (let orgIndex = 1; orgIndex < organizationArr.length; orgIndex++) {
                    /* Here we create duplicate forms and then add the form._id to the 
                    owner of the original form, which is the user. */
                        var promise = Form.create({
                            email: savedForm.email,
                            status: savedForm.status,
                            template: savedForm.template,
                            link: savedForm.link,
                            responses: savedForm.responses,
                            meta: savedForm.meta,
                            letter: savedForm.letter,
                            duplicated: true,
                            organization: organizationArr[orgIndex],
                            owner: savedForm.owner
                        });

                        // for each orgIndex, push remaining here
                        promise.then(function(savedForm){
                            savedFormIdArr.push(savedForm._id);
                            /* We update the response for organization to the right ones here */
                            FormSchema.statics.findForm(savedForm._id, function (err, foundForm) {
                                if (err) {
                                    console.log("error finding saved Form");
                                } else {
                                    let duplicateResponse =  foundForm['responses'];

                                    // setting correct tags, take in account for custom q
                                    let allFieldsInForm = fieldsByForm[orgIndex].fields;
                                    for(let j=0; j<duplicateResponse.length; j++) {
                                        for(let k=0; k<allFieldsInForm.length; k++) {
                                            if(duplicateResponse[j].tag === allFieldsInForm[k].fieldTag) {
                                                duplicateResponse[j].response = allFieldsInForm[k].response;
                                            }
                                        }
                                    }

                                    foundForm['template']['questions'].forEach(function (question){
                                        if(question.organizationFlag){
                                            var savedFormResponse = duplicateResponse[question.number - 1];
                                            savedFormResponse.response = organizationArr[orgIndex];
                                            foundForm.save().then(function(updatedForm){
                                                console.log("saved response");
                                            }, function(rejected) {
                                                console.log("rejected save: " + rejected);
                                            });
                                        } 
                                    });
                                }
                            });
                        }, function(rejected) {
                            console.log("rejected promise: " + rejected);
                        });
                    }
                }

                //Adding form._id to user (who is the owner of the original form)
                db.model('User').findOne({_id: form.owner}).populate('forms').exec( function(err, user) {
                    if(err) {
                        console.log("error in form User.findOne");
                    } else {
                        if(savedFormIdArr.length == organizationArr.length-1)
                        for(let i=0; i < savedFormIdArr.length; i++) {
                            user.forms.push(savedFormIdArr[i]);
                        }
                        user.save();
                    }
                });
                
                
            }, function(err) {
                console.log("promise error: " + err);
            });  
        }
        cb(err);
    });
};

FormSchema.statics.completeForm = function (id, letter, cb) {
    FormSchema.statics.findForm(id, function (err, form) {
        if (err) {
            cb(err, null);
        } else {
            form.letter = letter;
            form.status = 'Complete';

            if (!form['meta']['completed']) {
                form['meta']['completed'] = Date.now();
            }

            form.save(function (err) {
                cb(err, form);
            });
        }
    });
};


var Form = db.model('Form', FormSchema);

module.exports = Form;