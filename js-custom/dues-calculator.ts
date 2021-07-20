//TODO: Wechselkurse dynamisch laden (einmalig)
//TODO: Freelancer mit 25% Abzug berücksichtigen

let EXCHANGE_RATIOS = [0.51125, 1.0, 0.43901, 0.61071] // In der Reihenfolge der Currencies, https://themoneyconverter.com/BGN/EUR
let SOCIAL_SEC_EMPLOYEE_PCT = 0.1378;
let SOCIAL_SEC_EMPLOYER_PCT = 0.1892;
let MAX_SOCIAL_SEC_INCOME_BGN = 3000.00;

let TAX_PCT = 0.1000;

let FREELANCER_DEDUCTION_PCT = 0.25;


function onInteraction(view:View) {
    let model = view.Model;

    model.ExchangeRatio = EXCHANGE_RATIOS[model.Currency];

    let periodFactor = model.IncomePeriod == IncomePeriods.Month ? 1.0 : 12.0;
    let socialSecurityShares:SocialSecurityShares;
    let grossIncome:number;

    if (model.IncomeType == IncomeTypes.Revenue) {
        model.Revenue = model.Income;

        let duesRelevantIncome = model.IsFreelancer ? model.Income - model.Income * FREELANCER_DEDUCTION_PCT
                                                    : model.Income;

        let monthlyGrossIncome = (duesRelevantIncome / periodFactor) / (1 + SOCIAL_SEC_EMPLOYER_PCT);
        let monthlySocialSecurityShares = CalculateSocialSecurity(monthlyGrossIncome, model.ExchangeRatio);

        model.TotalSocialSec = monthlySocialSecurityShares.Multiply(periodFactor).Total;

        let taxableIncome = duesRelevantIncome - model.TotalSocialSec;
        model.TotalTaxes = taxableIncome * TAX_PCT;

        model.Payout = model.Revenue - model.TotalTaxes - model.TotalSocialSec;
    }
    else if (model.IncomeType == IncomeTypes.Payout) {
        model.IsFreelancer = false; // no freelancer calculation allowed if net payout is given!

        model.Payout = model.Income;

        let taxableIncome = model.Income / (1-TAX_PCT);

        let monthlyGrossIncome = (taxableIncome / periodFactor) / (1 - SOCIAL_SEC_EMPLOYEE_PCT);
        let monthlySocialSecurityShares = CalculateSocialSecurity(monthlyGrossIncome, model.ExchangeRatio);
        model.TotalSocialSec = monthlySocialSecurityShares.Multiply(periodFactor).Total;

        model.TotalTaxes = taxableIncome * TAX_PCT;

        model.Revenue = model.Payout + model.TotalTaxes + model.TotalSocialSec;
    }

    view.Update(model);
}

class SocialSecurityShares {
    public Employee:number;
    public Employer:number;

    public Multiply(factor:number): SocialSecurityShares {
        let x = new SocialSecurityShares();
        x.Employee = this.Employee * factor;
        x.Employer = this.Employer * factor;
        return x;
    }

    public get Total() {
        return this.Employee + this.Employer;
    }
}

function CalculateSocialSecurity(grossIncome:number, exchangeRatio:number):SocialSecurityShares {
    let socialSecIncome = grossIncome;
    let grossIncomeBGN = grossIncome / exchangeRatio;
    if (grossIncomeBGN > MAX_SOCIAL_SEC_INCOME_BGN)
        socialSecIncome = MAX_SOCIAL_SEC_INCOME_BGN * exchangeRatio;

    let socialSec = new SocialSecurityShares();
    socialSec.Employee = socialSecIncome * SOCIAL_SEC_EMPLOYEE_PCT;
    socialSec.Employer = socialSecIncome * SOCIAL_SEC_EMPLOYER_PCT;
    return socialSec;
}


/*
========== Model ==========
 */


enum IncomeTypes {
    Payout,
    Revenue
}

enum IncomePeriods {
    Month,
    Year
}

enum Currencies {
    EUR,
    BGN,
    GBP,
    USD
}



export class Model {
    public IncomeType:IncomeTypes = IncomeTypes.Revenue;
    public IncomePeriod:IncomePeriods = IncomePeriods.Month;
    public Income:number;
    public Currency:Currencies = Currencies.EUR;
    public ExchangeRatio:number = EXCHANGE_RATIOS[Currencies.EUR];
    public IsFreelancer = false;

    public Payout:number = 0.0;
    public Revenue:number = 0.0;

    public TotalTaxes:number = 0.0;
    public TotalSocialSec:number = 0.0;
}


/*
========== View ==========
 */


let CURRENCY_SYMBOLS = ["€", "лв", "£", "$"]; // Reihenfolge wie bei Currencies

export class View {
    sb_incomeType:HTMLSelectElement;
    tx_income:HTMLInputElement;
    sb_currency:HTMLSelectElement;
    lb_exchangeRatio:HTMLElement;
    cb_isFreelancer:HTMLInputElement;
    sb_incomePeriod:HTMLSelectElement;

    lb_payout:HTMLElement;
    lb_totalTaxes:HTMLElement;
    lb_totalSocialSec:HTMLElement;
    lb_revenue:HTMLElement;


    constructor() {
        this.sb_incomeType = document.getElementById("incometype") as HTMLSelectElement;
        this.sb_incomeType.onchange = () => this.OnChanged(this);

        this.tx_income = document.getElementById("income") as HTMLInputElement;
        // Bei jedem Tastendruck sofort die Kalkulation aktualisieren.
        // Allerdings muss einen Moment gewartet werden, bis die Veränderung in .value
        // angekommen ist.
        this.tx_income.onkeyup = (e:KeyboardEvent) => {
            setTimeout(() => {
                var x = parseFloat(this.tx_income.value);
                if (isNaN(x) == false) this.OnChanged(this);
            }, 50)
        };
        // Auch wenn keine Veränderung vorgenommen wurde bei ENTER und Verlassen des Feldes
        // neu kalkulieren. (Das könnte evtl. auch weg.)
        this.tx_income.onchange = () => this.OnChanged(this);
        this.tx_income.onkeypress = (e:KeyboardEvent) => {
            if (e.key == "\n") this.OnChanged(this);
        };


        this.sb_currency = document.getElementById("currency") as HTMLSelectElement;
        this.sb_currency.onchange = () => this.OnChanged(this);

        this.lb_exchangeRatio = document.getElementById("exchangeratio");

        this.cb_isFreelancer = document.getElementById("isFreelancer") as HTMLInputElement;
        this.cb_isFreelancer.onchange = () => this.OnChanged(this);

        this.sb_incomePeriod = document.getElementById("incomeperiod") as HTMLSelectElement;
        this.sb_incomePeriod.onchange = () => this.OnChanged(this);

        this.lb_payout = document.getElementById("payout");
        this.lb_totalTaxes = document.getElementById("totaltaxes");
        this.lb_totalSocialSec = document.getElementById("totalsocialsec");
        this.lb_revenue = document.getElementById("revenue");
    }


    public get Model(): Model {
        let model = new Model();
        model.IncomeType = this.IncomeType;
        model.Currency = this.Currency;
        model.IncomePeriod = this.IncomePeriod;
        model.IsFreelancer = this.cb_isFreelancer.checked;

        let x = parseFloat(this.tx_income.value);
        model.Income = isNaN(x) ? 0.0 : x;

        return model;
    }

    public Update(model: Model) {
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

    }


    INCOME_TYPE_OPTIONS = ["payout","revenue"]
    get IncomeType(): IncomeTypes {
        switch(this.sb_incomeType.value){
            case this.INCOME_TYPE_OPTIONS[IncomeTypes.Payout]: return IncomeTypes.Payout;
            case this.INCOME_TYPE_OPTIONS[IncomeTypes.Revenue]: return IncomeTypes.Revenue;
        }
    }
    set IncomeType(value:IncomeTypes) {
        this.sb_incomeType.value = this.INCOME_TYPE_OPTIONS[value];
    }

    CURRENCY_OPTION = ["EUR","BGN","GBP", "USD"]
    get Currency(): Currencies {
        switch(this.sb_currency.value){
            case this.CURRENCY_OPTION[Currencies.EUR]: return Currencies.EUR;
            case this.CURRENCY_OPTION[Currencies.BGN]: return Currencies.BGN;
            case this.CURRENCY_OPTION[Currencies.GBP]: return Currencies.GBP;
            case this.CURRENCY_OPTION[Currencies.USD]: return Currencies.USD;

        }
    }
    set Currency(value:Currencies) {
        this.sb_currency.value = this.CURRENCY_OPTION[value];
    }

    INCOME_PERIOD_OPTIONS = ["month","year"]
    get IncomePeriod(): IncomePeriods {
        switch(this.sb_incomePeriod.value){
            case this.INCOME_PERIOD_OPTIONS[IncomePeriods.Month]: return IncomePeriods.Month;
            case this.INCOME_PERIOD_OPTIONS[IncomePeriods.Year]: return IncomePeriods.Year;
        }
    }
    set IncomePeriod(value:IncomePeriods) {
        this.sb_incomePeriod.value = this.INCOME_PERIOD_OPTIONS[value];
    }


    public OnChanged: (view: View) => void;
}


/*
========== Construction/Run ==========
 */


let view = new View();
view.OnChanged = onInteraction;
