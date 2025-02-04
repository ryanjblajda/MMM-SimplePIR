const NodeHelper = require('node_helper');
const Log = require('logger');  // Import the Log module from MagicMirror
const GPIO = require("@iiot2k/gpiox");

module.exports = NodeHelper.create({
  start: function() {
    Log.info('[MMM-SimplePIR] starting...');
    this.debounceUS = 1000
    this.displayPower = false
  },
  stop: function() 
  {
    if (this.config != null) {
      GPIO.deinit_gpio(this.config.pirSensorPin);
    }
  },
  // Handle socket notifications from the frontend
  socketNotificationReceived: function(notification, payload) {
    switch(notification) {
      case 'SET_CONFIG':
        Log.info('[MMM-SimplePIR] Received configuration for MMM-SimplePIR module');

        // Save the configuration
        this.config = payload;
        this.setupCallback();
        break;
    }
  },

  onBlankIntervalExpired: function()
  {
    Log.log(`[MMM-SimplePIR] muting the display due to lack of motion`)
    this.sendSocketNotification('mute', true)
  },

  onOffIntervalExpired: function()
  {
    Log.log(`[MMM-SimplePIR] turning off physical display due to an extended lack of motion.`)
    Log.log(`[MMM-SimplePIR] making sure the display is physically off...`)
    if (this.displayPower)
    {
      this.displayOff();
    }
  },

  displayOnPulse: function() {
    Log.log(`[MMM-SimplePIR] making sure the display is physically on...`)
    GPIO.set_gpio(this.config.displayOnPin, true)

    setTimeout(() => {
      GPIO.set_gpio(this.config.displayOnPin, false)
    }, 100);
    this.displayPower = true;
    this.sendSocketNotification('display', this.displayPower);
  },

  displayOffPulse: function() {
    GPIO.set_gpio(this.config.displayOffPin, true)
    //give time for the guy to actually work
    setTimeout(() => {
      GPIO.set_gpio(this.config.displayOffPin, false)
    }, 100);
    this.displayPower = false;
    this.sendSocketNotification('display', this.displayPower);
  },

  displayState: function(state) {
    //if the config is set up to invert the pin, invert the state
    if (this.config.displayOnOffInvertState) { state = !state; }
    //finally set the state of the output pin
    GPIO.set_gpio(this.config.displayOnOffPin, state);
  },

  onPIRSensorEvent: function(state, edge) 
  {
    //edge 1 == falling, edge 0 == rising
    //state 0 == motion, state 1 == no motion
    Log.log(`[MMM-SimplePIR] pin: ${this.config.pirSensorPin} state: ${state} edge: ${edge}`);

    if(state == 1) {
      Log.log(`[MMM-SimplePIR] activating timers due to lack of motion`)
      this.sendSocketNotification('motion', false);
      Log.log(`[MMM-SimplePIR] blank timer will fire after ${this.minutesToMS(this.config.blankScreenTimeout)}`)
      this.blankTimer = setTimeout(this.onBlankIntervalExpired.bind(this), this.minutesToMS(this.config.blankScreenTimeout));
      Log.log(`[MMM-SimplePIR] off timer will fire after ${this.minutesToMS(this.config.offScreenTimeout)}`)
      this.offTimer = setTimeout(this.onOffIntervalExpired.bind(this), this.minutesToMS(this.config.offScreenTimeout));
    }
    else
    {
      Log.log(`[MMM-SimplePIR] clearing timers due to motion`)
      this.sendSocketNotification('motion', true);
      if (this.blankTimer != null) 
      {
        clearTimeout(this.blankTimer);
        clearTimeout(this.offTimer);
        //make sure the display is physically on.
        this.sendSocketNotification('mute', false);
        if (this.displayPower == false) {
          this.displayOn();
        }
      }
    }
  },

  minutesToMS: function(interval) {
    return 1000 * interval * 60;
  },

  configurePIRSensor: function() {
    let sensorPinOk = false;

    if (this.config.pirSensorPin != -1) {
      if (this.config.debug) Log.info(`[MMM-SimplePIR] ${this.config.pirSensorPin} is a valid input pin, creating watch`)
      GPIO.watch_gpio(this.config.pirSensorPin, GPIO.GPIO_MODE_INPUT_PULLUP, this.debounceUS, GPIO.GPIO_EDGE_BOTH, this.onPIRSensorEvent.bind(this));
      sensorPinOk = true;
    }
    else { Log.warn(`[MMM-SimplePIR] unable to load a valid pin from the configuration!`); }

    if (sensorPinOk == true)
    {
      if (this.config.debug) Log.info(`[MMM-SimplePIR] checking the initial state of the PIR sensor`)
      state = GPIO.get_gpio(this.config.pirSensorPin)
      this.onPIRSensorEvent(state, 0)
    }
  },

  usePulsePins: function() {
    //if we are using the pulse pins, do registration
    if (this.config.displayOnPin != -1 && this.config.displayOffPin != -1) {
      if (this.config.debug) Log.info(`[MMM-SimplePIR] ${this.config.displayOnPin} && ${this.config.displayOffPin} are valid pins, initializing as outputs...`)
      GPIO.init_gpio(this.config.displayOnPin, GPIO.GPIO_MODE_OUTPUT, 0);
      GPIO.init_gpio(this.config.displayOffPin, GPIO.GPIO_MODE_OUTPUT, 0);

      this.displayOnPulse();
    }
    else { Log.warn(`[MMM-SimplePIR] unable to load valid pins from the configuration!`); }
  },

  useLatchingPin: function() {
    //if we are using a single relay, use that pin
    if (this.config.displayOnOffPin != -1) {
      if (this.config.debug) Log.info(`[MMM-SimplePIR] ${this.config.displayOnOffPin} is a valid pin, initializing as an output...`);
      GPIO.init_gpio(this.config.displayOnOffPin, GPIO.GPIO_MODE_OUTPUT, 0);
      //set the display on.
      this.displayState(true);
    }
  },

  setupCallback: function()
  {

    if (this.config.debug) Log.info(`[MMM-SimplePIR] attempting to set up PIR sensor watch callback...`);
    //is the config is setup for using the on/off pins, fire the appropriate function
    if (this.config.useOnOffPin) { this.usePulsePins(); }
    //if not, fire the latching function
    else { this.useLatchingPin(); }
    //lastly, configure the PIR sensor and check the initial state
    this.configurePIRSensor();
  },
});
