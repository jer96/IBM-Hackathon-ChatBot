$(document).ready(function(){
	checkEmail = false;
	$.ajax("/set-language"+"?"+"lang="+window.localStorage.lang,{
		dataType: 'json',
		timeout:5000000,
		type:"post",
		data:{
			"text":[
			"Watson doesn't recognize this user.",
			"Watson is here to help!",
			"Your password is incorrect.",
			"Maybe you forgot your password?",
			"Watson noticed you already started the immigration process. Let's pick up where you left off!",
			"Email",
			"Password",
			"Create",
			"Log in",
			"Existing user?",
			"Log in.",
			"New user?",
			"Create an account."
			]
		},
		success:function(data,status,xhr){
			console.log(data);
			text = data.translatedText;
			$(".unknown-user").text(text[0]);
			$(".help").text(text[1]);
			inside = $(".incorrect-pw a");
			$(".incorrect-pw a").remove();
			$(".incorrect-pw").text(text[2]+" ");
			inside.text(text[3]);
			inside.addClass("lost-password");
			$(".incorrect-pw").append(inside);
			$(".already-user").text(text[4]);
			$(".title-new").removeClass("white");
			$(".email-container input").attr("placeholder",text[5]);
			$(".password-container input").attr("placeholder",text[6]);
			$(".existing-user-submission .submit-button").text(text[8]);
			console.log($(".existing-user-submission .submit-button").text());
			$(".new-user-submission .submit-button").text(text[7]);
			inside = $(".existing-user h4 a");
			$(".existing-user h4 a").remove();
			$(".existing-user h4").text(text[9]+" ");
			inside.text(text[10]);
			inside.addClass("existing-user-click");
			$(".existing-user h4").append(inside);	
			//change the new user click information
			inside = $(".new-user h4 a");
			$(".new-user h4 a").remove();
			$(".new-user h4").text(text[11]+" ");
			inside.text(text[12]);
			inside.addClass("new-user-click");
			$(".new-user h4").append(inside);
			listenClicks();
			
		},
		error:function(jqXhr,textStatus,errorMessage){
			alert(errorMessage);
		}
	});

	$(".email-container input").removeClass("current");
	$(".existing-user-submission .email-container input").addClass("current");

	listenClicks();

	$(".submit-button").click(function(){
	  window.sessionStorage.setItem("email",$(".current").val());
  	});

	$(".current").click(function(){
		checkEmail = true;
	});

	window.setInterval(function(){
		if($(".current").val() == ""){
			checkEmail = false;
			$(".current").css("border-color","#CCC");
			$(".submit-button").addClass("disabled");
		}
		else{
			checkEmail = true;
			currentVal = $(".current").val();
			if ((currentVal == "") && !checkEmail){
				$(".current").css("border-color","#CCC");
				$(".submit-button").addClass("disabled");
			}
			else if (currentVal != ""){
				check = validateEmail(currentVal);
				if (!check){
					$(".current").css("border-color","#FF2C2C");
					$(".submit-button").addClass("disabled");
					
				}
				else{
					$(".current").css("border-color","#11E500");
					pw = $(".current").parent().parent().parent().next().find("input").val()
					if (pw != ""){
						$(".submit-button").removeClass("disabled");
					}
					else{
						$(".submit-button").addClass("disabled");
					}
				}
			}
		}
	},100);
});
var showChoice = function(text){

	//show login/create options	
	// $(".language").addClass("hidden");
	// $(".login-choice").removeClass("hidden");
	//change the new class here
	// $(".title h2").text(text[0]);
	// $(".title").removeClass("hidden");
	// $(".create").text(text[5]);
	// $(".login").text(text[4]);




	// DO TRANSLATION HERE

	// $(".login").click(function(){
	// 	changeInformation(text);
	// 	$(".existing-user-submission").removeClass("hidden");
	// 	$(".new-user-submission").addClass("hidden");
	// 	$(".existing-user-submission .email-container input").addClass("current");
	// 	$(".existing-user").addClass("hidden");
	// 	$(".new-user").removeClass("hidden");
	// 	listenClicks();
	// });

	// $(".create").click(function(){
	// 	changeInformation(text);
	// 	$(".new-user-submission").removeClass("hidden");
	// 	$(".existing-user-submission").addClass("hidden");
	// 	$(".new-user-submission .email-container input").addClass("current");
	// 	$(".new-user").addClass("hidden");
	// 	$(".existing-user").removeClass("hidden");
	// 	listenClicks();
	// });


}

var changeInformation = function(text){
	//hide the choices
	$(".login-choice").addClass("hidden");
	//translate the form information
	$(".email-container input").attr("placeholder",text[1]);
	$(".password-container input").attr("placeholder",text[2]);
	$(".new-user-submission button").text(text[3]);
	//including the other submission button
	$(".existing-user-submission button").text(text[4]);
	//change the existing user click information
	inside = $(".existing-user h4 a");
	$(".existing-user h4 a").remove();
	$(".existing-user h4").text(text[6]+" ");
	inside.text(text[7]);
	inside.addClass("existing-user-click");
	$(".existing-user h4").append(inside);
	//change the new user click information
	inside = $(".new-user h4 a");
	$(".new-user h4 a").remove();
	$(".new-user h4").text(text[8]+" ");
	inside.text(text[9]);
	inside.addClass("new-user-click");
	$(".new-user h4").append(inside);
}



var listenClicks = function(){
		$(".existing-user-click").click(function(){
			$(".existing-user-submission").removeClass("hidden");
			$(".new-user-submission").addClass("hidden");
			$(".existing-user-submission .email-container input").addClass("current");
			$(".new-user-submission .email-container input").removeClass("current");
			$(".existing-user").addClass("hidden");
			$(".new-user").removeClass("hidden");
			$(".submit-button").addClass("disabled");
		});
		$(".new-user-click").click(function(){
			$(".new-user-submission").removeClass("hidden");
			$(".existing-user-submission").addClass("hidden");
			$(".new-user-submission .email-container input").addClass("current");
			$(".existing-user-submission .email-container input").removeClass("current");
			$(".new-user").addClass("hidden");
			$(".existing-user").removeClass("hidden");
			$(".submit-button").addClass("disabled");
		});
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}



