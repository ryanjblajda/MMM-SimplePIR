MMM-SimplePIR 

A simple PIR module that uses a PIR sensor with a digital output, and it utilizes gpio interrupts to check it. I liked the MMM-Pir module that once existed, but I didnt see an easy way to add a feature that physically turned off a monitor after a specified timeout, as well as blanking the screen. This utilizes the gpio outputs on the Pi to drive buttons intended for use with this RF controlled outlet (https://a.co/d/4hUItyW) [driven by some NPN transistors with current limiting resistors to prevent gpio damage]. 

The module emits the following notification: MMM_PIR-SCREEN_POWERSTATUS, with a boolean payload of whether the display is on or off. this happens when the display is muted, or physically turned on/off

If the module is visible, it will provide some basic debugging statistics


An example config is shown below:

```{
    module: 'MMM-SimplePIR',
    //position: 'top_left',
    hidden: true,
    config:
    {
        debug: true,            //enables debug printing
        blankScreenTimeout: 1,  //in minutes, when the screen will be blacked out. 
        offScreenTimeout: 60,   //in minutes, when the screen will be physically turned off.
        pirSensorPin: 17,       //where the output of the PIR sensor should be connected
        displayOnPin: 23,       //connect this to either the on button on a display, or to the RF outlet controller [or whatever you want]
        displayOffPin: 24,      //connect this to either the off button on a display, or to the RF outlet controller [or whatever you want]
    }
},```