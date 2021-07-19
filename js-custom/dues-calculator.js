"use strict";
//TODO: Wechselkurse dynamisch laden (einmalig)
//TODO: Freelancer mit 25% Abzug berücksichtigen
Object.defineProperty(exports, "__esModule", { value: true });
exports.View = exports.Model = void 0;
var EXCHANGE_RATIOS = [0.51125, 1.0, 0.43901, 0.61071]; // In der Reihenfolge der Currencies, https://themoneyconverter.com/BGN/EUR
var SOCIAL_SEC_EMPLOYEE_PCT = 0.1378;
var SOCIAL_SEC_EMPLOYER_PCT = 0.1892;
var TAX_PCT = 0.1000;
var MAX_SOCIAL_SEC_INCOME_BGN = 3000.00;
var FREELANCER_DEDUCTION_PCT = 0.25;
function onInteraction(view) {
    var model = view.Model;
    model.ExchangeRatio = EXCHANGE_RATIOS[model.Currency];
    var periodFactor = model.IncomePeriod == IncomePeriods.Month ? 1.0 : 12.0;
    var socialSecurityShares;
    var grossIncome;
    if (model.IncomeType == IncomeTypes.Revenue) {
        var duesRelevantIncome = model.IsFreelancer ? model.Income - model.Income * FREELANCER_DEDUCTION_PCT
            : model.Income;
        var monthlyGrossIncome = (duesRelevantIncome / periodFactor) / (1 + SOCIAL_SEC_EMPLOYER_PCT);
        var monthlySocialSecurityShares = CalculateSocialSecurity(monthlyGrossIncome, model.ExchangeRatio);
        socialSecurityShares = monthlySocialSecurityShares.Multiply(periodFactor);
        grossIncome = model.Income - socialSecurityShares.Employer;
        /*

        revenue -> prel. gross
        prel. gross -> gross

         */
    }
    else if (model.IncomeType == IncomeTypes.Payout) {
        var duesRelevantIncome = model.IsFreelancer ? model.Income - model.Income * FREELANCER_DEDUCTION_PCT
            : model.Income;
        var taxableIncome_1 = model.Income / (1 - TAX_PCT);
        var monthlyGrossIncome = (taxableIncome_1 / periodFactor) / (1 - SOCIAL_SEC_EMPLOYEE_PCT);
        var monthlySocialSecurityShares = CalculateSocialSecurity(monthlyGrossIncome, model.ExchangeRatio);
        socialSecurityShares = monthlySocialSecurityShares.Multiply(periodFactor);
        grossIncome = taxableIncome_1 + socialSecurityShares.Employee;
        /*

        payout -> taxable
        taxable -> prel. gross
        prel. gross -> gross

         */
    }
    model.TotalSocialSec = socialSecurityShares.Total;
    model.Revenue = grossIncome + socialSecurityShares.Employer;
    if (model.IncomeType == IncomeTypes.Payout && model.IsFreelancer)
        model.Revenue = model.Revenue - model.Revenue * FREELANCER_DEDUCTION_PCT;
    var taxableIncome = grossIncome - socialSecurityShares.Employee;
    model.TotalTaxes = taxableIncome * TAX_PCT;
    model.Payout = taxableIncome - model.TotalTaxes;
    view.Update(model);
}
var SocialSecurityShares = /** @class */ (function () {
    function SocialSecurityShares() {
    }
    SocialSecurityShares.prototype.Multiply = function (factor) {
        var x = new SocialSecurityShares();
        x.Employee = this.Employee * factor;
        x.Employer = this.Employer * factor;
        return x;
    };
    Object.defineProperty(SocialSecurityShares.prototype, "Total", {
        get: function () {
            return this.Employee + this.Employer;
        },
        enumerable: false,
        configurable: true
    });
    return SocialSecurityShares;
}());
function CalculateSocialSecurity(grossIncome, exchangeRatio) {
    var socialSecIncome = grossIncome;
    var grossIncomeBGN = grossIncome / exchangeRatio;
    if (grossIncomeBGN > MAX_SOCIAL_SEC_INCOME_BGN)
        socialSecIncome = MAX_SOCIAL_SEC_INCOME_BGN * exchangeRatio;
    var socialSec = new SocialSecurityShares();
    socialSec.Employee = socialSecIncome * SOCIAL_SEC_EMPLOYEE_PCT;
    socialSec.Employer = socialSecIncome * SOCIAL_SEC_EMPLOYER_PCT;
    return socialSec;
}
/*
========== Model ==========
 */
var IncomeTypes;
(function (IncomeTypes) {
    IncomeTypes[IncomeTypes["Payout"] = 0] = "Payout";
    IncomeTypes[IncomeTypes["Revenue"] = 1] = "Revenue";
})(IncomeTypes || (IncomeTypes = {}));
var IncomePeriods;
(function (IncomePeriods) {
    IncomePeriods[IncomePeriods["Month"] = 0] = "Month";
    IncomePeriods[IncomePeriods["Year"] = 1] = "Year";
})(IncomePeriods || (IncomePeriods = {}));
var Currencies;
(function (Currencies) {
    Currencies[Currencies["EUR"] = 0] = "EUR";
    Currencies[Currencies["BGN"] = 1] = "BGN";
    Currencies[Currencies["GBP"] = 2] = "GBP";
    Currencies[Currencies["USD"] = 3] = "USD";
})(Currencies || (Currencies = {}));
var Model = /** @class */ (function () {
    function Model() {
        this.IncomeType = IncomeTypes.Revenue;
        this.IncomePeriod = IncomePeriods.Month;
        this.Currency = Currencies.EUR;
        this.ExchangeRatio = EXCHANGE_RATIOS[Currencies.EUR];
        this.IsFreelancer = false;
        this.Payout = 0.0;
        this.Revenue = 0.0;
        this.TotalTaxes = 0.0;
        this.TotalSocialSec = 0.0;
    }
    return Model;
}());
exports.Model = Model;
/*
========== View ==========
 */
var CURRENCY_SYMBOLS = ["€", "лв", "£", "$"]; // Reihenfolge wie bei Currencies
var View = /** @class */ (function () {
    function View() {
        var _this = this;
        this.INCOME_TYPE_OPTIONS = ["payout", "revenue"];
        this.CURRENCY_OPTION = ["EUR", "BGN", "GBP", "USD"];
        this.INCOME_PERIOD_OPTIONS = ["month", "year"];
        this.sb_incomeType = document.getElementById("incometype");
        this.sb_incomeType.onchange = function () { return _this.OnChanged(_this); };
        this.tx_income = document.getElementById("income");
        // Bei jedem Tastendruck sofort die Kalkulation aktualisieren.
        // Allerdings muss einen Moment gewartet werden, bis die Veränderung in .value
        // angekommen ist.
        this.tx_income.onkeyup = function (e) {
            setTimeout(function () {
                var x = parseFloat(_this.tx_income.value);
                if (isNaN(x) == false)
                    _this.OnChanged(_this);
            }, 50);
        };
        // Auch wenn keine Veränderung vorgenommen wurde bei ENTER und Verlassen des Feldes
        // neu kalkulieren. (Das könnte evtl. auch weg.)
        this.tx_income.onchange = function () { return _this.OnChanged(_this); };
        this.tx_income.onkeypress = function (e) {
            if (e.key == "\n")
                _this.OnChanged(_this);
        };
        this.sb_currency = document.getElementById("currency");
        this.sb_currency.onchange = function () { return _this.OnChanged(_this); };
        this.lb_exchangeRatio = document.getElementById("exchangeratio");
        this.cb_isFreelancer = document.getElementById("isFreelancer");
        this.cb_isFreelancer.onchange = function () { return _this.OnChanged(_this); };
        this.sb_incomePeriod = document.getElementById("incomeperiod");
        this.sb_incomePeriod.onchange = function () { return _this.OnChanged(_this); };
        this.lb_payout = document.getElementById("payout");
        this.lb_totalTaxes = document.getElementById("totaltaxes");
        this.lb_totalSocialSec = document.getElementById("totalsocialsec");
        this.lb_revenue = document.getElementById("revenue");
    }
    Object.defineProperty(View.prototype, "Model", {
        get: function () {
            var model = new Model();
            model.IncomeType = this.IncomeType;
            model.Currency = this.Currency;
            model.IncomePeriod = this.IncomePeriod;
            model.IsFreelancer = this.cb_isFreelancer.checked;
            var x = parseFloat(this.tx_income.value);
            model.Income = isNaN(x) ? 0.0 : x;
            return model;
        },
        enumerable: false,
        configurable: true
    });
    View.prototype.Update = function (model) {
        this.IncomeType = model.IncomeType;
        //this.tx_income.value = model.Income.toFixed(2);
        this.Currency = model.Currency;
        this.lb_exchangeRatio.innerText = "(1лв=" + model.ExchangeRatio.toFixed(5) + CURRENCY_SYMBOLS[model.Currency] + ")";
        this.cb_isFreelancer.checked = model.IsFreelancer;
        this.IncomePeriod = model.IncomePeriod;
        this.lb_payout.innerText = model.Payout.toFixed(2) + CURRENCY_SYMBOLS[model.Currency];
        this.lb_totalTaxes.innerText = model.TotalTaxes.toFixed(2) + CURRENCY_SYMBOLS[model.Currency];
        this.lb_totalSocialSec.innerText = model.TotalSocialSec.toFixed(2) + CURRENCY_SYMBOLS[model.Currency];
        this.lb_revenue.innerText = model.Revenue.toFixed(2) + CURRENCY_SYMBOLS[model.Currency];
    };
    Object.defineProperty(View.prototype, "IncomeType", {
        get: function () {
            switch (this.sb_incomeType.value) {
                case this.INCOME_TYPE_OPTIONS[IncomeTypes.Payout]: return IncomeTypes.Payout;
                case this.INCOME_TYPE_OPTIONS[IncomeTypes.Revenue]: return IncomeTypes.Revenue;
            }
        },
        set: function (value) {
            this.sb_incomeType.value = this.INCOME_TYPE_OPTIONS[value];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(View.prototype, "Currency", {
        get: function () {
            switch (this.sb_currency.value) {
                case this.CURRENCY_OPTION[Currencies.EUR]: return Currencies.EUR;
                case this.CURRENCY_OPTION[Currencies.BGN]: return Currencies.BGN;
                case this.CURRENCY_OPTION[Currencies.GBP]: return Currencies.GBP;
                case this.CURRENCY_OPTION[Currencies.USD]: return Currencies.USD;
            }
        },
        set: function (value) {
            this.sb_currency.value = this.CURRENCY_OPTION[value];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(View.prototype, "IncomePeriod", {
        get: function () {
            switch (this.sb_incomePeriod.value) {
                case this.INCOME_PERIOD_OPTIONS[IncomePeriods.Month]: return IncomePeriods.Month;
                case this.INCOME_PERIOD_OPTIONS[IncomePeriods.Year]: return IncomePeriods.Year;
            }
        },
        set: function (value) {
            this.sb_incomePeriod.value = this.INCOME_PERIOD_OPTIONS[value];
        },
        enumerable: false,
        configurable: true
    });
    return View;
}());
exports.View = View;
/*
========== Construction/Run ==========
 */
var view = new View();
view.OnChanged = onInteraction;
