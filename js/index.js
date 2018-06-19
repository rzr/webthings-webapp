function log(arg)
{
  if (arg && arg.name && arg.message) {
    var err = arg;
    log("exception [" + err.name + "] msg[" + err.message + "]");
  }
  var text = "log: " + arg + "\n";
  console.log(text);
  document.form.console.value += text;
  document.form.console.value.scrollTop = document.form.console.value.scrollHeight;
}

function evalSource()
{
  var source = document.form.source.value;
  eval(source);
}

window.onload = function() {
    // TODO:: Do your initialization job

    // add eventListener for tizenhwkey
    document.addEventListener('tizenhwkey', function(e) {
        if (e.keyName === "back") {
            try {
                tizen.application.getCurrentApplication().exit();
            } catch (ignore) {}
        }
    });
};
