var request = require('supertest');
var Promise = require('bluebird')
var app = require('../app');
var models = require('../models');

var child_process = require('child_process');

var check_for_inkscape = function() {
  // We can't just use execSync here, because we want to support Node 0.10
  return new Promise(function(resolve, reject) {
    child_process.exec('inkscape --version', function(err, stdout, stderr) {
      if (err) {
        console.warn("Skipping tests that require Inkscape: " + err);
        resolve(false);
      } else {
        resolve(true);
      };
    });
  });
}

function set_user(agent, email, done) {
   agent.post('/auth/logout')
   .expect(200)
   .end(function() {
     agent.post('/auth/login')
     .send({'email': email})
     .expect(200)
     .end(done);
   });
};

describe('registration', function() {
  var agent = request.agent(app);

  before('Make sure all tables exist', function(done) {
    app.db.sequelize.sync({force: true})
    .then(function() {
      done();
    });
  });

  // Initial login
  it('should refuse access to registration', function(done) {
    agent.get('/registration/register')
    .expect(401)
    .end(done);
  });

  it('should login', function(done) {
    agent.post('/auth/login')
    .send({'email': 'usera@regcfp'})
    .expect(200)
    .expect('Welcome usera@regcfp')
    .end(done);
  });

  // Displaying registration form
  it('should show registration form', function(done) {
    agent.get('/registration/register')
    .expect(200)
    .expect(/name="name" value=""/)
    .expect(/Hide my name/)
    .end(done);
  });

  it('should show prepended country', function(done) {
    agent.get('/registration/register')
    .expect(200)
    .expect(/<select\s*name="field_country_pre"[^>]*>\s*<option[^>]*>prepended country<\/option>/m)
    .end(done);
  });

  it('should show documentation HTML', function(done) {
    agent.get('/registration/register')
    .expect(200)
    .expect(/docentry/)
    .expect(/<h3>Documentation test html<\/h3>/)
    .end(done);
  });

  it('should not show internal fields', function(done) {
    agent.get('/registration/register')
    .expect(200)
    .expect(function (res) { if (res.text.match('Internal')) throw new Error('Contains string "Internal".'); })
    .end(done);
  });

  it('should show form on empty name', function(done) {
    agent.post('/registration/register')
    .send({'name': '  '})
    .expect(200)
    .expect(/name="name" value=""/)
    .expect(/Hide my name/)
    .end(done);
  });

  it('should handle empty forms', function(done) {
    agent.post('/registration/register')
    .expect(200)
    .expect(/name="name" value=""/)
    .expect(/Hide my name/)
    .end(done);
  });

  // Submission
  it('should ask amount', function(done) {
    agent.post('/registration/register')
    .send({'name': 'TestUser A'})
    .send({'field_ircnick': 'testirc'})
    .send({'is_public': 'true'})
    .send({'field_shirtsize': 'M'})
    .expect(200)
    .expect(/name="name" value=""/)
    .expect(/Please choose a registration fee/)
    .end(done);
  });

  it('should allow registration', function(done) {
    agent.post('/registration/register')
    .send({'name': 'TestUser A'})
    .send({'field_ircnick': 'testirc'})
    .send({'is_public': 'true'})
    .send({'currency': 'EUR'})
    .send({'field_shirtsize': 'M'})
    .send({'regfee': '1'})
    .expect(200)
    .expect(/Thanks for registering/)
    .end(done);
  });

  // Listing all registrations
  it('should list registrations', function(done) {
    agent.get('/registration/list')
    .expect(200)
    .expect(/TestUser A/)
    .expect(function (res) { if (res.text.match('[^\'"]usera@regcfp[^\'"]')) throw new Error('Mail should not be included!'); })
    .expect(function (res) { if (res.text.match('Internal')) throw new Error('Internal fields should not be included!'); })
    .end(done)
  });

  it('list should not show documentation fields', function(done) {
    agent.get('/registration/list')
    .expect(200)
    .expect(function (res) { if (res.text.match('docentry')) throw new Error('String found!'); })
    .end(done)
  });

  // Editing existing registration
  it('should show filled in registration form', function(done) {
    agent.get('/registration/register')
    .expect(200)
    .expect(/name="name" value="TestUser A"/)
    .expect(/name="regfee" class="reg-fee" value="1"/)
    .expect(/option value="EUR"[^>]*selected="selected"/)
    .expect(/Hide my name/)
    .end(done);
  });

  it('should allow updates', function(done) {
    agent.post('/registration/register')
    .send({'name': 'TestUser A'})
    .send({'field_ircnick': 'testirc'})
    // Not sending it defaults to false. And this adds another tested line.
    //.send({'is_public': 'false'})
    .expect(200)
    .expect(/Your registration was updated, thank you/)
    .end(done);
  });

  // Proof that this works to check the DB
//  it('country ends up in database', function(done) {
//    var res = agent.post('/registration/register')
//    .send({'name': 'TestUser A'})
//    .send({'field_ircnick': 'testirc'})
//    .send({'field_country': 'testing'})
//    .expect(200)
//    .then(function() {
//      models.RegistrationInfo.count({'where' : { 'field' : 'country', 'value' : 'testing' }})
//        .then(function (count) {
//          if (count == 0)
//            done(new Error('Field did not end ended up in database!'))
//          else
//            done();
//        });
//    });
//  });

//  it('documentation fields are ignored when storing into database', function(done) {
//    var res = agent.post('/registration/register')
//    .send({'name': 'TestUser A'})
//    .send({'field_ircnick': 'testirc'})
//    .send({'field_doc': 'testing'})
//    .expect(200)
//    .then(function() {
//      models.RegistrationInfo.count({'where' : { 'field' : 'doc', 'value' : 'testing' }})
//        .then(function (count) {
//          if (count != 0)
//            done(new Error('Field end ended up in database!'))
//          else
//            done();
//        });
//    });
//  });

  // Payment
  // FIXME: payment for purchases should be required up front;
  // needs a separate test
  it('should show the payment form', function(done) {
    agent.get('/registration/pay')
    .expect(200)
    .expect(/Amount/)
    .end(done);
  });

  it('should show payment form on blank', function(done) {
    agent.post('/registration/pay')
    .expect(200)
    .expect(/<form[^>]+action="\/registration\/pay\/do"/)
    .end(done);
  });

  it('should show payment choice', function(done) {
    agent.post('/registration/pay')
    .send({'currency': 'EUR'})
    .send({'regfee': '10'})
    .expect(200)
    .expect(/paypal/)
    .expect(/onsite/)
    .end(done);
  });

  it('should mark zero as onsite payment', function(done) {
    agent.post('/registration/pay/do')
    .send({'currency': 'EUR'})
    .send({'regfee': '0'})
    // Default is onsite, let's test that default
    //.send({'method': 'onsite'})
    .expect(200)
    .expect(/asked to pay for your registration/)
    .end(done);
  });

  it('should refuse non-zero payment', function(done) {
    agent.post('/registration/pay/do')
    .send({'currency': 'EUR'})
    .send({'regfee': '10'})
    .expect(402)
    .end(done);
  });

  it('should accept non-zero onsite payment', function(done) {
    agent.post('/registration/pay/do')
    .send({'currency': 'EUR'})
    .send({'regfee': '10'})
    .send({'method': 'onsite'})
    .expect(200)
    .expect(/asked to pay for your registration/)
    .end(done);
  });

  it('should accept second non-zero onsite payment', function(done) {
    agent.post('/registration/pay/do')
    .send({'currency': 'EUR'})
    .send({'regfee': '10'})
    .send({'method': 'onsite'})
    .expect(200)
    .expect(/asked to pay for your registration/)
    .end(done);
  });

  it('should no longer list user', function(done) {
    agent.get('/registration/list')
    .expect(200)
    .expect(/<\/tr>\n<\/table>/)
    .end(done)
  });

  // Test admin stuff
  it('logout second user', function(done) {
    agent.post('/auth/logout')
    .expect(200)
    .expect('Logged out')
    .end(done);
  });

  it('should login as admin', function(done) {
    agent.post('/auth/login')
    .send({'email': 'admin@regcfp'})
    .expect(200)
    .expect('Welcome admin@regcfp')
    .end(done);
  });

  it('register admin', function(done) {
    agent.post('/authg/register')
    .send({'origin': '/papers/submit'})
    .send({'fullname': 'Admin'})
    .end(done);
  });

  it('should allow registration by admin', function(done) {
    agent.post('/registration/register')
    .send({'name': 'Admin'})
    .send({'field_ircnick': 'adminnick'})
    .send({'field_shirtsize': 'M'})
    .send({'is_public': 'true'})
    .send({'currency': 'EUR'})
    .send({'regfee': '1'})
    .expect(200)
    .expect(/Thanks for registering/)
    .end(done);
  });

  it('should list all info for admin (except payment)', function(done) {
    agent.get('/registration/admin/list')
    .expect(200)
    .expect(/TestUser A/)
    .expect(/testirc/)
    .expect(/usera@regcfp/)
    .expect(/Admin/)
    .expect(/adminnick/)
    .expect(/Internal/)
    .expect(function (res) { if (res.text.match('Paid')) throw new Error('String "Paid" found!'); })
    .end(done);
  });

  // Desk system
  it('should show desk', function(done) {
    agent.get('/desk')
    .expect(200)
    .expect(/TestUser A/)
    .expect(/Admin/)
    .end(done);
  });

  it('should show desk add', function(done) {
    agent.get('/desk/add')
    .expect(200)
    .expect(/Your name/)
    .end(done);
  });

  it('should allow desk add', function(done) {
    agent.post('/desk/add')
    .send({'email': 'userc@regcfp'})
    .send({'name': 'TestUser C'})
    .send({'irc': 'test'})
    .send({'gender': 'test'})
    .send({'country': 'test'})
    .send({'is_public': 'false'})
    .expect(200)
    .expect(/Please return the laptop to the desk./)
    .end(done);
  });

  it('should show added user', function(done) {
    agent.get('/desk')
    .expect(200)
    .expect(/TestUser A/)
    .expect(/Admin/)
    .expect(/TestUser C/)
    .end(done);
  });

  it('should accept payment add', function(done) {
    agent.post('/desk/payment/add')
    .send({'regid': '2'})
    .send({'currency': 'EUR'})
    .send({'amount': '25'})
    .expect(302)
    .expect('Location', '/desk?added=2&amount=25')
    .end(done);
  });

  it('should detect desk receipt requirement', function(done) {
    agent.get('/desk/receipt/?regid=2')
    .expect(200)
    .expect(/your payment of €25/)
    .end(done);
  });

  it('should accept clear', function(done) {
    agent.post('/desk/payment/clear')
    .send({'regid': '2'})
    .expect(302)
    .expect('Location', '/desk?cleared=2')
    .end(done);
  });

  it('should accept markpaid', function(done) {
    agent.post('/desk/payment/markpaid')
    .send({'regid': '1'})
    .expect(302)
    .expect('Location', '/desk?paid=1')
    .end(done);
  });

  it('should show desk message new_id', function(done) {
    agent.get('/desk/?new_id=1')
    .expect(200)
    .expect(/Registration 1 was added/)
    .end(done);
  });

  it('should show desk message paid', function(done) {
    agent.get('/desk/?paid=1')
    .expect(200)
    .expect(/Registration 1 was marked as paid/)
    .end(done);
  });

  it('should show desk message cleared', function(done) {
    agent.get('/desk/?cleared=1')
    .expect(200)
    .expect(/Payments for 1 were cleared/)
    .end(done);
  });

  it('should show desk message added', function(done) {
    agent.get('/desk/?added=1&amount=10')
    .expect(200)
    .expect(/Payment of 10 registered for 1/)
    .end(done);
  });

  it('should show desk message printed', function(done) {
    agent.get('/desk/?printed=1')
    .expect(200)
    .expect(/Registration 1 was finished/)
    .expect(/Please finish a second one to print badges/)
    .end(done);
  });

  it('should accept finish', function(done) {
    agent.post('/desk/finish')
    .send({'regid': '1'})
    .send({'printed': '2'})
    .expect(200)
    .expect(/Click here to print badge/)
    .end(done);
  });

  it('should print badge', function(done) {
    var test = this;
    check_for_inkscape().then(function(inkscape_found) {
      if (!inkscape_found) {
        test.skip();
      } else {
        agent.get('/desk/badge?regida=1&regidb=2')
        .expect(200)
        .expect(/%PDF-1./)
        .end(done);
      };
    });
  });

  it('logout admin user', function(done) {
    agent.post('/auth/logout')
    .expect(200)
    .expect('Logged out')
    .end(done);
  });

  it('should login as payment admin', function(done) {
    agent.post('/auth/login')
    .send({'email': 'payadm@regcfp'})
    .expect(200)
    .expect('Welcome payadm@regcfp')
    .end(done);
  });

  it('register payment admin', function(done) {
    agent.post('/authg/register')
    .send({'origin': '/papers/submit'})
    .send({'fullname': 'Payment Admin'})
    .end(done);
  });

  it('should list all info for payment admin', function(done) {
    agent.get('/registration/admin/list')
    .expect(200)
    .expect(/TestUser A/)
    .expect(/testirc/)
    .expect(/Admin/)
    .expect(/adminnick/)
    .expect(/Internal/)
    .expect(/Paid/)
    .expect(/admin@regcfp/)
    .end(done);
  });

  describe('inventory', function() {
    var agent = request.agent(app);

    before('Login', function(done) {
      set_user(agent, 'inventory-test@regcfp', done);
    });

    it('shows items for purchase', function(done) {
      agent.get('/registration/register')
      .expect(200)
      .expect(/<input type="radio" class="purchase-option" name="field_room" value="1 night" data-cost="20" data-left="2"/)
      .expect(/<input type="radio" class="purchase-option" name="field_room" value="2 nights" data-cost="40" data-left="4"/)
      .end(done);
    });

    it('allows purchasing items', function(done) {
     agent.post('/registration/register')
      .send({'name': 'Purchaser 1'})
      .send({'field_ircnick': 'p1'})
      .send({'is_public': 'true'})
      .send({'currency': 'EUR'})
      .send({'field_room': '1 night'})
      .send({'regfee': '1'})
      .expect(200)
      .expect(/Thanks for registering/)
      .end(done);
    });

    it('updates inventory after purchase', function(done) {
      // We change users for this test, because users don't see the room they
      // bought themselves as taken.
      set_user(agent, 'inventory-test-2@regcfp', function() {
        agent.get('/registration/register')
        .expect(200)
        .expect(/<input type="radio" class="purchase-option" name="field_room" value="1 night" data-cost="20" data-left="1"/)
        .expect(/<input type="radio" class="purchase-option" name="field_room" value="2 nights" data-cost="40" data-left="4"/)
        .end(done);
      });
    });

    it('allows second purchase', function(done) {
     agent.post('/registration/register')
      .send({'name': 'Purchaser 2'})
      .send({'field_ircnick': 'p2'})
      .send({'is_public': 'true'})
      .send({'currency': 'EUR'})
      .send({'field_room': '1 night'})
      .send({'regfee': '1'})
      .expect(200)
      .expect(/Thanks for registering/)
      .end(done);
    });

    it('prevents purchase changes after registration', function(done) {
      agent.post('/registration/register')
      .send({'field_room': 'None'})
      .expect(200)
      .expect(/You cannot change purchase choice after registration for field: Accommodation booking/)
      .end(done);
    });

    it('updates inventory again after purchase', function(done) {
      // We change users for this test, because users don't see the room they
      // bought themselves as taken.
      set_user(agent, 'inventory-test-3@regcfp', function() {
        agent.get('/registration/register')
        .expect(200)
        .expect(/<input type="radio" class="purchase-option" name="field_room" value="1 night" data-cost="20" data-left="0"/)
        .expect(/<input type="radio" class="purchase-option" name="field_room" value="2 nights" data-cost="40" data-left="4"/)
        .end(done);
      });
    });

    it('does not allow purchase after items are sold out', function(done) {
      set_user(agent, 'inventory-test-3@regcfp', function() {
       agent.post('/registration/register')
        .send({'name': 'Purchaser 3'})
        .send({'field_ircnick': 'p3'})
        .send({'is_public': 'true'})
        .send({'currency': 'EUR'})
        .send({'field_room': '1 night'})
        .send({'regfee': '1'})
        .expect(200)
        .expect(/Something went wrong: No more &#x27;1 night&#x27; purchases available for field: Accommodation booking./)
        .end(done);
      });
    });
  });
});
