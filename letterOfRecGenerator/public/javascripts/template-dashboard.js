function saveTemplate() {
    console.log("@@@@@@@@@@@@@@@@ HERE @@@@@@@@@@@@@@@@@@@@@@");
    var template = document.getElementById("template").value;
    $.ajax({
        url: 'http://128.125.100.147:80/template-dashboard/uploadLetterTemplate',
        data: {
            template: template
        },
        type: 'POST',
        success: function(d){
            console.log("success in drive")
            window.location.href = 'http://128.125.100.147:80/template-dashboard';
        },
        error: function() {
            console.log("error in drive")
        }
    })
}

