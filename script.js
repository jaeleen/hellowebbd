// document.getElementById('exploreButton').addEventListener('click', function(event) {
//     event.preventDefault();
//     document.querySelector('.landing h1').classList.add('zoom-out');
//     setTimeout(function() {
//       window.location.href = event.target.querySelector('a').href;
//     }, 600); // The timeout duration should match the animation duration
//   });

  // Set the date we're counting down to
var countDownDate = new Date("May 31, 2024 15:37:25").getTime();

// Update the count down every 1 second
var x = setInterval(function() {

  // Get today's date and time
  var now = new Date().getTime();
    
  // Find the distance between now and the count down date
  var distance = countDownDate - now;
    
  // Time calculations for minutes and seconds
 
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
  // Output the result in an element with id="demo"
  document.getElementById("demo").innerHTML = minutes + "m " + seconds + "s ";
    
  // If the count down is over, write some text 
  if (distance < 0) {
    clearInterval(x);
    document.getElementById("demo").innerHTML = "EXPIRED";
  }
}, 1000);


// Welcome page js
