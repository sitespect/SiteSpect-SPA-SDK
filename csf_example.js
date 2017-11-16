    ! function() {
        var s = {
            "timestamps": {
                "1048296": "1510858827"
            },
            "variations": [{
                "campaign_id": "123456",
                "trigger_counted": 1,
                "counted": 0,
                "html": "New Promotion Text",
                "css": {
                    "font-weight": "bold"
                },
                "attributes": {},
                "id": "1048296",
                "selector": "#promotion",
                "criteria": [{
                    "Type": "Path",
                    "path_criterion": "/product/"
                }],
                "custom": ""
            }]
        };
        window.ss_dom_var ? window.ss_dom_var.setVariations(s) : window.__ss_variations = s
    }();