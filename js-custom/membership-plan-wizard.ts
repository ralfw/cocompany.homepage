function onInteraction(view:View) {
    let model = view.ViewModel;
    model.RecommendPlan = RecommendationEngine.Recommend(model);
    view.Update(model);
}


/*
================== Recommendation Engine ==================
 */


class MembershipPlanAvailability {
    public Visitor:boolean;
    public Tourist:boolean;
    public Resident:boolean;
    public ExpatFree:boolean;
    public ExpatLlc:boolean;
}


class RecommendationEngine {
    public static Recommend(model:Model): MembershipPlansOptions {
        let availablePlans = RecommendationEngine.Check_availability(model);
        return RecommendationEngine.Recommend_plan(availablePlans);
    }

    private static Check_availability(model: Model): MembershipPlanAvailability {
        let availablePlans = new MembershipPlanAvailability();

        // Tourist geht immer
        availablePlans.Tourist = true;

        // Resident ist der Plan der Wahl, wenn jmd nicht EU citizen ist, aber
        // einen Wohnsitz in BG bekommen will.
        availablePlans.Resident = model.EUCitizen == false &&
            model.BGResidency == BGResidencyOptions.WantsToBecomeBGResident;


        // Wann ist ein Expat-Plan eine gute Sache?
        // Erstmal ein paar grundlegende Einschätzungen...

        // Voraussetzung ist, dass ein BG Wohnsitz kein Problem ist:
        let bgResidencyNoProblemAndWanted = (model.EUCitizen || model.BGResidency == BGResidencyOptions.IsBGResident) &&
            model.BGResidency != BGResidencyOptions.UnsureIfBGResidencyWanted;

        // Eine Llc ist in manchen Fällen zwingend angesagt:
        let requiresLlc = model.Contractors ||
            model.Employees ||
            model.Inventory ||
            model.LimitedLiability ||
            model.AverageRevenue == AverageRevenueOptions.high;

        // Ein Expat ist keine gute Idee, wenn der Kandidat nur grad so über die Runden kommt.
        let justScrapingBy = model.AverageRevenue == AverageRevenueOptions.low && model.AverageExpenses == AverageExpensesOptions.negligible;

        // Auch ein Kriterium ist, wie es mit den Ausgaben (im Verhältnis zum Umsatz) aussieht.
        let smallToMediumExpenses = model.AverageExpenses == AverageExpensesOptions.negligible ||
            model.AverageExpenses == AverageExpensesOptions.medium;

        let mediumRevenueWithHighExpenses = model.AverageRevenue == AverageRevenueOptions.medium &&
            model.AverageExpenses == AverageExpensesOptions.high;


        // Und jetzt konkret:
        availablePlans.ExpatFree = bgResidencyNoProblemAndWanted &&
            smallToMediumExpenses &&
            justScrapingBy == false &&
            requiresLlc == false;

        availablePlans.ExpatLlc = bgResidencyNoProblemAndWanted &&
            (requiresLlc || mediumRevenueWithHighExpenses);

        return availablePlans;
    }


    private static Recommend_plan(availablePlans: MembershipPlanAvailability): MembershipPlansOptions {
        if (availablePlans.ExpatFree) return MembershipPlansOptions.Expat_Free;
        if (availablePlans.Resident) return MembershipPlansOptions.Resident;
        if (availablePlans.ExpatLlc) return MembershipPlansOptions.Expat_LLC;
        return MembershipPlansOptions.Tourist;
    }
}


/*
================== Model ==================
 */


enum MembershipPlansOptions {
    None,
    Visitor,
    Tourist,
    Resident,
    Expat_Free,
    Expat_LLC
}

enum BGResidencyOptions {
    IsBGResident,
    WantsToBecomeBGResident,
    UnsureIfBGResidencyWanted,
    DoesNotWantToBecomeBGResident
}

enum AverageRevenueOptions {
    low,
    medium,
    high
}

enum AverageExpensesOptions {
    negligible,
    medium,
    high
}


export class Model {
    public EUCitizen:boolean = false;
    public BGResidency:BGResidencyOptions = BGResidencyOptions.WantsToBecomeBGResident;

    public Contractors:boolean = false;
    public Employees:boolean = false;
    public Inventory:boolean = false;
    public LimitedLiability:boolean = false;

    public AverageRevenue:AverageRevenueOptions = AverageRevenueOptions.low;
    public AverageExpenses:AverageExpensesOptions = AverageExpensesOptions.negligible;

    public RecommendPlan:MembershipPlansOptions = MembershipPlansOptions.None;
}


/*
================== View ==================
 */


class ViewPlan {
    preview:HTMLElement;
    overview:HTMLElement;

    kind:string;

    constructor(kind:string) {
        this.kind = kind;

        this.preview = document.getElementById("planpreview-" + kind);
        this.overview = document.getElementById("plan-" + kind);
    }

    public set Recommend(value:boolean) {
        if (this.preview != null) this.preview.className = "planpreview_body" + (value ? " show" : "");
        if (this.overview != null) this.overview.className = "plan_body" + (value ? " recommended" : "");
    }
}


class ViewPlans {
    plans:ViewPlan[];

    constructor(initialRecommendedPlan:MembershipPlansOptions) {
        this.plans = [];
        this.plans[MembershipPlansOptions.None] = new ViewPlan("none");
        this.plans[MembershipPlansOptions.Visitor] = new ViewPlan("visitor");
        this.plans[MembershipPlansOptions.Tourist] = new ViewPlan("tourist");
        this.plans[MembershipPlansOptions.Resident] = new ViewPlan("resident");
        this.plans[MembershipPlansOptions.Expat_Free] = new ViewPlan("expat-free");
        this.plans[MembershipPlansOptions.Expat_LLC] = new ViewPlan("expat-llc");

        this.Update(initialRecommendedPlan);
    }

    public Update(recommendedPlan:MembershipPlansOptions) {
        [
            MembershipPlansOptions.None,
            MembershipPlansOptions.Visitor,
            MembershipPlansOptions.Tourist,
            MembershipPlansOptions.Resident,
            MembershipPlansOptions.Expat_Free,
            MembershipPlansOptions.Expat_LLC
        ].forEach((plan) => {
            this.plans[plan].Recommend = false;
        })

        this.plans[recommendedPlan].Recommend = true;
    }
}


export class View {
    rb_EUCitizen_yes:HTMLInputElement;
    rb_EUCitizen_no:HTMLInputElement;

    sb_BGResidency:HTMLSelectElement;
    
    cb_contractors:HTMLInputElement;
    cb_employees:HTMLInputElement;
    cb_inventory:HTMLInputElement;
    cb_limitedLiability:HTMLInputElement;

    sb_AverageRevenue:HTMLSelectElement;
    sb_AverageExpenses:HTMLSelectElement;

    plans:ViewPlans;


    constructor() {
        this.rb_EUCitizen_yes = document.getElementById("yes") as HTMLInputElement;
        this.rb_EUCitizen_yes.onclick = () => this.OnChanged(this);

        this.rb_EUCitizen_no = document.getElementById("no") as HTMLInputElement;
        this.rb_EUCitizen_no.onclick = () => this.OnChanged(this);

        this.sb_BGResidency = document.getElementById("residency") as HTMLSelectElement;
        this.sb_BGResidency.onchange = () => this.OnChanged(this);

        this.cb_contractors = document.getElementById("contractors") as HTMLInputElement;
        this.cb_contractors.onclick = () => this.OnChanged(this);

        this.cb_employees = document.getElementById("employees") as HTMLInputElement;
        this.cb_employees.onclick = () => this.OnChanged(this);

        this.cb_inventory = document.getElementById("inventory") as HTMLInputElement;
        this.cb_inventory.onclick = () => this.OnChanged(this);

        this.cb_limitedLiability = document.getElementById("liability") as HTMLInputElement;
        this.cb_limitedLiability.onclick = () => this.OnChanged(this);

        this.sb_AverageRevenue = document.getElementById("revenue-2") as HTMLSelectElement;
        this.sb_AverageRevenue.onchange = () => this.OnChanged(this);

        this.sb_AverageExpenses = document.getElementById("expenses-2") as HTMLSelectElement;
        this.sb_AverageExpenses.onchange = () => this.OnChanged(this);

        this.plans = new ViewPlans(MembershipPlansOptions.None);
    }


    public get ViewModel() : Model {
        let vm = new Model();

        vm.EUCitizen = this.rb_EUCitizen_yes.checked;

        vm.BGResidency = this.BGResidency;

        vm.Contractors = this.cb_contractors.checked;
        vm.Employees = this.cb_employees.checked;
        vm.Inventory = this.cb_inventory.checked;
        vm.LimitedLiability = this.cb_limitedLiability.checked;

        vm.AverageRevenue = this.AverageRevenue;
        vm.AverageExpenses = this.AverageExpenses;

        return vm;
    }

    public Update(vm:Model) {
        this.rb_EUCitizen_yes.checked = vm.EUCitizen;
        this.rb_EUCitizen_no.checked = !this.rb_EUCitizen_yes.checked;

        this.BGResidency = vm.BGResidency;

        this.cb_contractors.checked = vm.Contractors;
        this.cb_employees.checked = vm.Employees;
        this.cb_inventory.checked = vm.Inventory;
        this.cb_limitedLiability.checked = vm.LimitedLiability;

        this.AverageRevenue = vm.AverageRevenue;
        this.AverageExpenses = vm.AverageExpenses;

        this.plans.Update(vm.RecommendPlan);
    }


    BG_RESIDENCY_OPTIONS = ["bg-have","bg-yes","bg-maybe","bg-no"];
    get BGResidency() : BGResidencyOptions {
        switch(this.sb_BGResidency.value) {
            case this.BG_RESIDENCY_OPTIONS[0]: return BGResidencyOptions.IsBGResident;
            case this.BG_RESIDENCY_OPTIONS[1]: return BGResidencyOptions.WantsToBecomeBGResident;
            case this.BG_RESIDENCY_OPTIONS[2]: return BGResidencyOptions.UnsureIfBGResidencyWanted;
            case this.BG_RESIDENCY_OPTIONS[3]: return BGResidencyOptions.DoesNotWantToBecomeBGResident;
            default: return BGResidencyOptions.WantsToBecomeBGResident;
        }
    }
    set BGResidency(value:BGResidencyOptions) {
        this.sb_BGResidency.value = this.BG_RESIDENCY_OPTIONS[value];
    }


    AVERAGE_REVENUE_OPTIONS = ["revenue-low","revenue-medium","revenue-high"];
    get AverageRevenue() : AverageRevenueOptions {
        switch(this.sb_AverageRevenue.value) {
            case this.AVERAGE_REVENUE_OPTIONS[0]: return AverageRevenueOptions.low;
            case this.AVERAGE_REVENUE_OPTIONS[1]: return AverageRevenueOptions.medium;
            case this.AVERAGE_REVENUE_OPTIONS[2]: return AverageRevenueOptions.high;
            default: return AverageRevenueOptions.low;
        }
    }
    set AverageRevenue(value:AverageRevenueOptions) {
        this.sb_AverageRevenue.value = this.AVERAGE_REVENUE_OPTIONS[value];
    }


    AVERAGE_EXPENSES_OPTIONS = ["expense-negligible", "expense-medium", "expenses-high"];
    get AverageExpenses() : AverageExpensesOptions {
        switch(this.sb_AverageExpenses.value) {
            case this.AVERAGE_EXPENSES_OPTIONS[0]: return AverageExpensesOptions.negligible;
            case this.AVERAGE_EXPENSES_OPTIONS[1]: return AverageExpensesOptions.medium;
            case this.AVERAGE_EXPENSES_OPTIONS[2]: return AverageExpensesOptions.high
            default: return AverageExpensesOptions.negligible;
        }
    }
    set AverageExpenses(value:AverageExpensesOptions) {
        this.sb_AverageExpenses.value = this.AVERAGE_EXPENSES_OPTIONS[value];
    }


    public OnChanged : (view:View) => void;
}


/*
================== Construction ==================
 */


let _view = new View();
_view.OnChanged = onInteraction;


