var test = (function () {


    var self = {}


    self.myVar={x:1,y:2}
    self.myFunction1=function(param1, param2){

    }

    self.myFunction2=function(){
        self.myFunction1(3,2)
    }
    return self;



})()