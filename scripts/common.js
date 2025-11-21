$.validator.addMethod('regex', function (value, element, param) {
	return this.optional(element) ||
		value.match(typeof param == 'string' ? new RegExp(param) : param);
},
	'Please enter valid number.');

var contactForm = $('#contact-form');
contactForm.validate({
	rules: {
		Phone: {
			required: true,
			regex: "^[0][1-9][0-9]{9}$|^[1-9][0-9]{9}$"
		},
	},
	errorPlacement: function (error, element) {
		var parent = element.parent();
		parent.find(".error-text").html(error);
	},
	submitHandler: function (form) {

		var data = {};
		var formData = contactForm.serializeArray();

		$.each(formData, function (index, value) {
			data[value.name] = value.value;
		});

		$.ajax({
			type: "POST",
			dataType: 'JSON',
			url: 'https://hfocusmedical.vercel.app/api/contact',
			data: JSON.stringify(data),
			contentType: 'application/json; charset=UTF-8',
			beforeSend: () => {
				contactForm.find('.fa-arrow-right').addClass("spinner-cust");
				$('#submit').attr('disabled', true);
			},
			success: function (resp) {
				contactForm.find('.fa-arrow-right').removeClass("spinner-cust");
				$('#submit').attr('disabled', false);
				contactForm.find('.alert-success').show();
				$('html,body').animate({
					scrollTop: contactForm.offset().top - 150
				}, 500);
				setTimeout(function () {
					contactForm.find('.alert-success').hide();
				}, 4000)
				contactForm[0].reset();
			},
			error: function (e) {
				contactForm.find('.fa-arrow-right').removeClass("spinner-cust");
				contactForm.find('.alert-danger').show();
				$('html,body').animate({
					scrollTop: contactForm.offset().top - 150
				}, 500);
				$('#submit').attr('disabled', false);
				setTimeout(function () {
					contactForm.find('.alert-danger').hide();
				}, 4000)
			}
		});
		return false;
	}
});

// Covid enquiry form
var covidForm = $('#covid-form');
covidForm.validate({
	rules: {
		Phone: {
			required: true,
			regex: "^[0][1-9][0-9]{9}$|^[1-9][0-9]{9}$"
		},
	},
	errorPlacement: function (error, element) {
		var parent = element.parent();
		parent.find(".error-text").html(error);
	},
	submitHandler: function (form) {

		var data = {};
		var formData = covidForm.serializeArray();

		$.each(formData, function (index, value) {
			data[value.name] = value.value;
		});

		$.ajax({
			type: "POST",
			dataType: 'JSON',
			url: 'https://api.mecuresmartbuy.com/v1/LIMS_covidEnquiry',
			data: JSON.stringify({
				data,
				"title": $(form).data('title')
			}),
			beforeSend: () => {
				covidForm.find('.fa-arrow-right').addClass("spinner-cust");
				$('#submit').attr('disabled', true);
			},
			success: function (resp) {
				covidForm.find('.fa-arrow-right').removeClass("spinner-cust");
				$('#submit').attr('disabled', false);
				covidForm.find('.alert-success').show();
				$('html,body').animate({
					scrollTop: covidForm.offset().top - 150
				}, 500);
				setTimeout(function () {
					covidForm.find('.alert-success').hide();
				}, 4000)
				covidForm[0].reset();
			},
			error: function (e) {
				covidForm.find('.fa-arrow-right').removeClass("spinner-cust");
				covidForm.find('.error-success').show();
				$('html,body').animate({
					scrollTop: covidForm.offset().top - 150
				}, 500);
				$('#submit').attr('disabled', false);
				setTimeout(function () {
					covidForm.find('.error-success').hide();
				}, 4000)
			}
		});
		return false;
	}
});

// Onco enquiry form
var oncoForm = $('#onco-form');
oncoForm.validate({
	rules: {
		Contact_no: {
			required: true,
			regex: "^[0][1-9][0-9]{9}$|^[1-9][0-9]{9}$"
		},
	},
	errorPlacement: function (error, element) {
		var parent = element.parent();
		parent.find(".error-text").html(error);
	},
	submitHandler: function (form) {

		var data = {};
		var formData = oncoForm.serializeArray();
		//console.log(formData); return false;
		$.each(formData, function (index, value) {
			data[value.name] = value.value;
		});
		data['test'] = '3186&PET CT&0';

		$.ajax({
			type: "POST",
			dataType: 'JSON',
			url: 'https://hellodoc.mecure.com/v1/HD_oncoEnquiryFromWebsite',
			// data: JSON.stringify({
			// 	data,
			// 	"title": $(form).data('title')
			// }),
			data: JSON.stringify({data}),
			beforeSend: () => {
				oncoForm.find('.fa-arrow-right').addClass("spinner-cust");
				$('#submit').attr('disabled', true);
			},
			success: function (resp) {
				console.log('here');
				oncoForm.find('.fa-arrow-right').removeClass("spinner-cust");
				$('#submit').attr('disabled', false);
				oncoForm.find('.alert-success').show();
				$('html,body').animate({
					scrollTop: oncoForm.offset().top - 150
				}, 500);
				setTimeout(function () {
					oncoForm.find('.alert-success').hide();
				}, 4000)
				oncoForm[0].reset();
			},
			error: function (e) {
				oncoForm.find('.fa-arrow-right').removeClass("spinner-cust");
				oncoForm.find('.error-success').show();
				$('html,body').animate({
					scrollTop: oncoForm.offset().top - 150
				}, 500);
				$('#submit').attr('disabled', false);
				setTimeout(function () {
					oncoForm.find('.error-success').hide();
				}, 4000)
			}
		});
		return false;
	}
});

// Onco enquiry form
var oncoFormDetail = $('#onco-detail-form');
oncoFormDetail.validate({
	rules: {
		
	},
	errorPlacement: function (error, element) {
		var parent = element.parent();
		parent.find(".error-text").html(error);
	},
	submitHandler: function (form) {
		oncoFormDetail.find('.alert-success').hide();
		var data = {};
		var formData = oncoFormDetail.serializeArray();
		$.each(formData, function (index, value) {
			data[value.name] = value.value;
		});

		var propsed_treatment = new Array();
		$("input[name='propsed_treatment']:checked").each(function () {
			propsed_treatment.push($(this).val());
		});
		data['propsed_treatment'] = propsed_treatment.toString();
		
		$.ajax({
			type: "POST",
			dataType: 'JSON',
			url: 'https://hellodoc.mecure.com/v1/HD_oncoEnquiryDetailFormWebsite',
			// data: JSON.stringify({
			// 	data,
			// 	"title": $(form).data('title')
			// }),
			data: JSON.stringify({ data }),
			beforeSend: () => {
				oncoFormDetail.find('.fa-arrow-right').addClass("spinner-cust");
				$('#submit').attr('disabled', true);
			},
			success: function (resp) {
				oncoFormDetail.find('.fa-arrow-right').removeClass("spinner-cust");
				$('#submit').attr('disabled', false);
				oncoFormDetail.find('.alert-success').show();
				
				let msg = "Your application has been submitted. <br/> Reference No: " + resp.data.reference_no + "<br/> Our call center team shall connect with you shortly for booking an appointment within 24 hrs. <br/>Please feel free to connect with us at info@mecure.com.mg for any further assistance. "
				$("#success_msg").html(msg);
				$('html,body').animate({
					scrollTop: oncoFormDetail.offset().top - 150
				}, 500);
				
				// setTimeout(function () {
				// 	oncoFormDetail.find('.alert-success').hide();
				// }, 4000);

				oncoFormDetail[0].reset();
			},
			error: function (e) {
				oncoFormDetail.find('.fa-arrow-right').removeClass("spinner-cust");
				oncoFormDetail.find('.error-success').show();
				$('html,body').animate({
					scrollTop: oncoFormDetail.offset().top - 150
				}, 500);
				$('#submit').attr('disabled', false);
				setTimeout(function () {
					oncoFormDetail.find('.error-success').hide();
				}, 4000)
			}
		});
		return false;
	}
});

(function ($) {
	"use strict";

	$(function () {
		var header = $(".start-style");
		$(window).scroll(function () {
			var scroll = $(window).scrollTop();

			if (scroll >= 10) {
				header.removeClass('start-style').addClass("scroll-on");
			} else {
				header.removeClass("scroll-on").addClass('start-style');
			}
		});
	});

	//Animation
	$(window).load(function () {
		$('.page-loader').hide();
		$('body').removeClass('body-loader');
	})

	// $('#alert-modal').modal('show')

	$(document).ready(function () {

		$('body.hero-anime').removeClass('hero-anime');

		$(".flatpickr").flatpickr({
			minDate: new Date(),
			dateFormat: "d-m-Y",
			disableMobile: true
		});

		if (getMobileOperatingSystem() == "Android" || getMobileOperatingSystem() == "Windows Phone") {
			$('.play-store-btn').hide()
			$('.app-store-btn').show()
		}
		else if (getMobileOperatingSystem() == "iOS") {
			$('.play-store-btn').show()
			$('.app-store-btn').hide()
		}

		$('.slider').slick({
			infinite: true,
			slidesToShow: 2,
			slidesToScroll: 2,
			arrows: false,
			dots: true,
			autoplay: true,
			autoplaySpeed: 2500,
			responsive: [
				{
					breakpoint: 768,
					settings: {
						slidesToShow: 1,
						slidesToScroll: 1,
						infinite: true,
						dots: true,
						arrows: false,
					}
				}
			]
		});

		$('#plan-slider').slick({
			infinite: true,
			slidesToShow: 5,
			slidesToScroll: 1,
			arrows: false,
			dots: true,
			autoplay: true,
			autoplaySpeed: 2000,
			responsive: [
				{
					breakpoint: 1500,
					settings: {
						slidesToShow: 3,
					}
				},
				{
					breakpoint: 1200,
					settings: {
						slidesToShow: 2,
						slidesToScroll: 1,
						centerMode: false
					}
				},
				{
					breakpoint: 768,
					settings: {
						slidesToShow: 1,
						slidesToScroll: 1,
						centerMode: false,
					}
				}
			]
		});

	});

	//Menu On Hover

	$('nav').on('mouseenter mouseleave', '.nav-item', function (e) {
		if ($(window).width() > 750) {
			var _d = $(e.target).closest('nav .nav-item'); _d.addClass('show');
			setTimeout(function () {
				_d[_d.is(':hover') ? 'addClass' : 'removeClass']('show');
			}, 1);
		}
	});

	//Switch light/dark

	$("#switch").on('click', function () {
		if ($("body").hasClass("dark")) {
			$("body").removeClass("dark");
			$("#switch").removeClass("switched");
		}
		else {
			$("body").addClass("dark");
			$("#switch").addClass("switched");
		}
	});

	// COVID-19 statistics - temporarily disabled due to CORS issues
	// $.getJSON('https://s3.ap-south-1.amazonaws.com/test.ml.prathamesh/data.json', function (data) {
	// 	$("#confirmedCount").html(data.Nigeria.total_case)
	// 	$("#discharedCount").html(data.Nigeria.total_recovered)
	// 	$("#totalDeath").html(data.Nigeria.total_death)
	// }).fail(function() {
	// 	console.log('COVID-19 data unavailable');
	// });
	
	// Set default values for COVID-19 statistics
	$("#confirmedCount").html("N/A")
	$("#discharedCount").html("N/A")
	$("#totalDeath").html("N/A")


})(jQuery);

// Device identification
function getMobileOperatingSystem() {
	var userAgent = navigator.userAgent || navigator.vendor || window.opera;

	// Windows Phone must come first because its UA also contains "Android"
	if (/windows phone/i.test(userAgent)) {
		return "Windows Phone";
	}

	if (/android/i.test(userAgent)) {
		return "Android";
	}

	// iOS detection from: http://stackoverflow.com/a/9039885/177710
	if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
		return "iOS";
	}

	return "unknown";
}
