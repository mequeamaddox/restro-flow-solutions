import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Star, Zap, Crown, ChefHat } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  
  const plans = [
    {
      name: "Essential",
      monthlyPrice: 149,
      annualPrice: 119, // 20% discount
      period: "per location",
      description: "Core features for growing restaurants",
      icon: ChefHat,
      color: "from-blue-500 to-cyan-500",
      popular: false,
      competitorPrice: 330,
      features: [
        "Real-time inventory tracking",
        "Recipe costing & management", 
        "Purchase order automation",
        "Comprehensive waste tracking",
        "Daily P&L statements",
        "Price alerts & monitoring",
        "Mobile app access",
        "Email & chat support",
        "Basic POS integration",
        "Up to 3 locations"
      ]
    },
    {
      name: "Professional",
      monthlyPrice: 199,
      annualPrice: 159, // 20% discount  
      period: "per location",
      description: "Most popular - complete MarginEdge alternative for 40% less",
      icon: Star,
      color: "from-orange-500 to-red-500", 
      popular: true,
      competitorPrice: 330,
      features: [
        "Everything in Essential",
        "Advanced analytics dashboard",
        "Unlimited locations", 
        "All POS/accounting integrations",
        "Automated invoice processing (24-48hr)",
        "Budget tracking & variance analysis",
        "Theoretical vs actual reporting",
        "Vendor bill payment processing",
        "Menu engineering analysis", 
        "Priority phone support",
        "API access",
        "Custom report builder"
      ]
    },
    {
      name: "Enterprise",
      monthlyPrice: 249,
      annualPrice: 199, // 20% discount
      period: "per location", 
      description: "Premium features for restaurant chains",
      icon: Crown,
      color: "from-purple-500 to-pink-500",
      popular: false,
      competitorPrice: 480, // vs premium competitor solution
      features: [
        "Everything in Professional",
        "Smart scale integration",
        "White-label solution",
        "Custom integrations", 
        "Dedicated account manager",
        "Advanced security & compliance",
        "Custom training & onboarding",
        "SLA guarantees (99.9% uptime)",
        "Multi-brand management",
        "Advanced user permissions",
        "Commission transfers",
        "Enterprise-grade reporting"
      ]
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-orange-400 blur-3xl"></div>
        <div className="absolute top-40 right-32 w-24 h-24 rounded-full bg-green-400 blur-2xl"></div>
        <div className="absolute bottom-32 left-1/3 w-40 h-40 rounded-full bg-yellow-400 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 rounded-full bg-red-400 blur-2xl"></div>
      </div>
      
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-4 pt-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <ArrowLeft className="h-5 w-5 text-orange-400 mr-2" />
                <span className="text-orange-400 hover:text-white transition-colors">Back to Home</span>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                className="bg-transparent border-2 border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-white px-6 py-2 font-semibold rounded-full transition-all duration-300"
                onClick={() => window.location.href = '/api/login'}
              >
                Login
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="container mx-auto px-4 pt-16 pb-16 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-black text-white mb-6">
              Choose Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                Success Plan
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Join over 2,400+ restaurants saving an average of $127,000 per year on food costs. 
              <strong className="text-orange-400">Up to 50% less than leading competitors.</strong>
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className={`text-lg ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-8 w-16 items-center rounded-full bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-orange-500 transition-transform ${
                    billingCycle === 'annual' ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-lg ${billingCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>Annual</span>
              <Badge className="bg-green-500 text-white ml-2">Save 20%</Badge>
            </div>

            {/* Competitive Comparison */}
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-3xl mx-auto mb-12 border border-orange-500/20">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-4">Industry Price Comparison</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-300 mb-2">Leading Competitor</div>
                    <div className="text-3xl font-bold text-red-400 line-through">$330/mo</div>
                    <div className="text-sm text-slate-400">Industry standard pricing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-300 mb-2">RestroFlow Professional</div>
                    <div className="text-3xl font-bold text-green-400">
                      ${billingCycle === 'monthly' ? '199' : '159'}/mo
                    </div>
                    <div className="text-sm text-orange-300 font-semibold">
                      Save ${billingCycle === 'monthly' ? '$131' : '$171'}/mo per location
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <div className="text-lg font-bold text-orange-300">
                    Annual Savings: ${billingCycle === 'monthly' ? '$1,572' : '$2,052'} per location
                  </div>
                </div>
              </div>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-8 mb-16">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">14-Day</div>
                <div className="text-sm text-slate-400">Free Trial</div>
              </div>
              <div className="w-px h-8 bg-slate-600"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">No Setup</div>
                <div className="text-sm text-slate-400">Fees</div>
              </div>
              <div className="w-px h-8 bg-slate-600"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">Cancel</div>
                <div className="text-sm text-slate-400">Anytime</div>
              </div>
            </div>
          </div>
        </header>

        {/* Add-Ons Section */}
        <section className="container mx-auto px-4 pb-12">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-6">Premium Add-Ons</h2>
            <p className="text-slate-300 mb-8">Specialized features for bars, breweries, and complex operations</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bar Operations Add-On */}
              <Card className="bg-slate-800/80 backdrop-blur-sm border-amber-500/50 hover:border-amber-400/70 transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 12V7a1 1 0 011-1h12a1 1 0 011 1v5M5 12l1.5 6h11L19 12M5 12h14M9 3v3M15 3v3"/>
                    </svg>
                  </div>
                  <CardTitle className="text-xl font-bold text-white mb-2">Bar & Beverage Operations</CardTitle>
                  <CardDescription className="text-slate-300">Specialized inventory for liquor, beer, wine & cocktails</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-black text-amber-400">+$79</div>
                    <div className="text-sm text-slate-400">per location/month</div>
                    {billingCycle === 'annual' && (
                      <div className="text-xs text-green-400 mt-1 font-semibold">
                        Annual: +$63/mo (20% off)
                      </div>
                    )}
                  </div>
                  <ul className="text-left space-y-2 text-sm">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Liquor inventory tracking by oz/ml</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Cocktail recipe costing</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Pour cost analysis</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Beverage waste tracking</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Happy hour pricing</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">SpotOn POS integration</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Multi-Location Management Add-On */}
              <Card className="bg-slate-800/80 backdrop-blur-sm border-blue-500/50 hover:border-blue-400/70 transition-all duration-300">
                <CardHeader className="text-center pb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <CardTitle className="text-xl font-bold text-white mb-2">Advanced Analytics</CardTitle>
                  <CardDescription className="text-slate-300">Enterprise-grade reporting & business intelligence</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-black text-blue-400">+$49</div>
                    <div className="text-sm text-slate-400">per location/month</div>
                    {billingCycle === 'annual' && (
                      <div className="text-xs text-green-400 mt-1 font-semibold">
                        Annual: +$39/mo (20% off)
                      </div>
                    )}
                  </div>
                  <ul className="text-left space-y-2 text-sm">
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Real-time P&L dashboards</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Cross-location comparisons</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Predictive cost forecasting</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Custom KPI tracking</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Automated alerts</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-4 w-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">Executive reporting</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Core Restaurant Plans</h2>
            <p className="text-slate-300">Choose your base plan, then add specialized features as needed</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <div key={plan.name} className="relative">
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-1 text-sm font-semibold">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <Card className={`bg-slate-800/80 backdrop-blur-sm border-slate-700/50 hover:border-orange-500/50 transition-all duration-300 h-full ${plan.popular ? 'scale-105 border-orange-500/30' : ''}`}>
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-white mb-2">{plan.name}</CardTitle>
                      <CardDescription className="text-slate-300 mb-4">{plan.description}</CardDescription>
                      
                      <div className="mb-6">
                        <div className="flex items-baseline justify-center">
                          <span className="text-4xl font-black text-white">
                            ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                          </span>
                          <span className="text-slate-400 ml-2">/month</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">{plan.period}</div>
                        {billingCycle === 'annual' && (
                          <div className="text-xs text-green-400 mt-1 font-semibold">
                            Billed annually • Save ${plan.monthlyPrice - plan.annualPrice}/mo
                          </div>
                        )}
                        <div className="text-xs text-orange-300 mt-2 font-semibold">
                          vs competitors ${plan.competitorPrice}/mo - Save ${plan.competitorPrice - (billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice)}/mo
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <Button 
                        className={`w-full mb-6 py-3 font-semibold rounded-full transition-all duration-300 ${
                          plan.popular 
                            ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg transform hover:scale-105' 
                            : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50 hover:text-white'
                        }`}
                        onClick={() => window.location.href = '/api/login'}
                      >
                        Start Free Trial
                      </Button>
                      
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <Check className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-300 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </section>

        {/* Example Pricing Calculator */}
        <section className="container mx-auto px-4 pb-12">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border-orange-500/30">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-white mb-2">Example: Restaurant + Bar</CardTitle>
                <CardDescription className="text-slate-300">Typical setup for your business model</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-slate-800/50 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-4">Table Service Restaurant</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Professional Plan</span>
                        <span className="text-white">${billingCycle === 'monthly' ? '199' : '159'}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Clover POS Integration</span>
                        <span className="text-green-400">Included</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center p-6 bg-slate-800/50 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-4">Bar & Grill Location</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Professional Plan</span>
                        <span className="text-white">${billingCycle === 'monthly' ? '199' : '159'}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Bar Operations Add-on</span>
                        <span className="text-amber-400">+${billingCycle === 'monthly' ? '79' : '63'}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">SpotOn POS Integration</span>
                        <span className="text-green-400">Included</span>
                      </div>
                      <div className="border-t border-slate-600 mt-2 pt-2 flex justify-between font-semibold">
                        <span className="text-white">Total per location</span>
                        <span className="text-orange-400">${billingCycle === 'monthly' ? '278' : '222'}/mo</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center p-4 bg-green-900/20 rounded-xl border border-green-500/30">
                  <div className="text-lg font-bold text-green-400">
                    Total Monthly Cost: ${billingCycle === 'monthly' ? '477' : '381'}/mo for both locations
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    vs leading competitors: $660/mo - Save ${billingCycle === 'monthly' ? '$183' : '$279'}/mo (${billingCycle === 'monthly' ? '$2,196' : '$3,348'}/year)
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-12">Frequently Asked Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How does the free trial work?</h3>
                <p className="text-slate-300 text-sm">Start with any plan for 14 days completely free. No credit card required. Full access to all features and add-ons.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Can I add bar operations to existing plans?</h3>
                <p className="text-slate-300 text-sm">Yes! Add the Bar & Beverage Operations add-on to any plan. Perfect for restaurants with bars or separate bar locations.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">What POS systems do you integrate with?</h3>
                <p className="text-slate-300 text-sm">We integrate with major POS systems including Toast, Square, Clover, SpotOn, and many others. Bar add-on includes specialized SpotOn integration.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Can I use different plans for different locations?</h3>
                <p className="text-slate-300 text-sm">Absolutely! Mix and match plans per location. Your restaurant might use Professional while your bar uses Professional + Bar Operations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 pb-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Stop Wasting Money?</h2>
            <p className="text-xl text-slate-300 mb-8">Join thousands of restaurants already saving with RestroFlow</p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-12 py-4 text-lg font-bold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
              onClick={() => window.location.href = '/api/login'}
            >
              Start Your Free Trial Now
            </Button>
            <div className="text-slate-400 text-sm mt-4">
              14-day free trial • No credit card required • Setup in 15 minutes
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}