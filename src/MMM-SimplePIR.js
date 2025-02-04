Module.register('MMM-SimplePIR', {
    // Define the module's defaults
    defaults: {
      debug: true,
      blankScreenTimeout: -1,
      offScreenTimeout: -1,
      pirSensorPin: -1,
      displayOnPin: -1, 
      displayOffPin: -1,
      displayOnOffPin: -1,
      displayOnOffUsesOffScreenTimeout:true,
      displayOnOffInvertState:false,
      useOnOffPin:false,
      motionPresent: false,
      powerOff: false,
      isMuted: false,
      lastMotionTime: null,
    },
  
    // Start the module
    start: function() {
      console.log('MMM-SimplePIR module starting...');
      
      // Send the configuration to the backend
      this.sendSocketNotification('SET_CONFIG', this.config);
    },

    opacityRegions(t) {
      var e = document.querySelectorAll(".main");
      e.forEach((i) => {
        i.style.opacity = t;
      });
    },

    getDateTimeNow() {
      var now = new Date();
      var dd = String(now.getDate()).padStart(2, '0');
      var mm = String(now.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = now.getFullYear();
      
      today = mm + '/' + dd + '/' + yyyy;
      todaytime = today + " @ " + now.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })

      return todaytime;
    },
  
    // Define socket notification handlers
    socketNotificationReceived: function(notification, payload) {
      switch(notification)
      {
        case 'display':
          this.sendNotification('MMM_PIR-SCREEN_POWERSTATUS', payload);
          if (payload == true) { 
            this.opacityRegions(1); 
            this.powerOff = false;
          }
          else { 
            this.opacityRegions(0); 
            this.powerOff = true;
          }
          this.updateDom();
          break;
        case 'mute':
          if (payload == true) { 
            this.opacityRegions(0); 
            //only send a notification if the new state to set is not equal to our current state.
            if (true != this.isMuted) { this.sendNotification('MMM_PIR-SCREEN_POWERSTATUS', !payload); }
            this.isMuted = true
          }
          else { 
            this.opacityRegions(1);
            //only send a notification if the new state to set is not equal to our current state.
            if (false != this.isMuted) { this.sendNotification('MMM_PIR-SCREEN_POWERSTATUS', !payload); }
            this.isMuted = false;
          }
          
          this.updateDom();
          break;
        case 'motion':
          if (payload == true) {
            this.motionPresent = true
            this.lastMotionTime = this.getDateTimeNow();
          }
          else {
            this.motionPresent = false
          }
          this.updateDom();
          break;
      }
    },
  
    // This function listens to the DOM_CREATED event and starts the stream cycle process
    notificationReceived: function(notification, payload, sender) {
      switch(notification) {
        case 'DOM_OBJECTS_CREATED':
          this.updateDom();
          break;
      }
    },

    getHeader: function() {
      return this.data.header = "Occupancy Status";
    },

    getDom: function() {
      var wrapper = document.createElement("div");
      wrapper.innerHTML = `Motion: ${this.motionPresent}<br/>Last Motion Time: ${this.lastMotionTime}<br/>Image Muted: ${this.isMuted}<br/>Display Power: ${!this.powerOff}`;
      return wrapper;
    }
  });
  