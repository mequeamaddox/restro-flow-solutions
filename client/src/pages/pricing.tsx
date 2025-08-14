import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Star, Zap, Crown, ChefHat } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  const plans = [
    {
      name: "Essential",
      price: 89,
      period: "per location/month",
      description: "Complete solution for single locations",
      icon: ChefHat,
      color: "from-blue-500 to-cyan-500",
      popular: false,
      savings: "vs MarginEdge $330/mo",
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
        "Unlimited inventory items"
      ]
    },
    {
      name: "Professional",
      price: 149,
      period: "per location/month",
      description: "Most popular - full feature restaurant management",
      icon: Star,
      color: "from-orange-500 to-red-500",
      popular: true,
      savings: "vs MarginEdge $330/mo",
      features: [
        "Everything in Essential",
        "Advanced analytics dashboard",
        "Multi-location management",
        "All POS system integrations",
        "Automated invoice processing",
        "Budget tracking & variance analysis",
        "Theoretical vs actual reporting",
        "Priority phone support",
        "API access",
        "Custom report builder",
        "Vendor bill payment",
        "Menu engineering analysis"
      ]
    },
    {
      name: "Enterprise",
      price: 199,
      period: "per location/month",
      description: "For restaurant chains and large operations",
      icon: Crown,
      color: "from-purple-500 to-pink-500",
      popular: false,
      savings: "vs MarginEdge $330/mo",
      features: [
        "Everything in Professional",
        "White-label solution",
        "Custom integrations",
        "Dedicated account manager",
        "Advanced security & compliance",
        "Custom training & onboarding",
        "SLA guarantees (99.9% uptime)",
        "Multi-brand management",
        "Advanced user permissions",
        "Custom workflows & automation",
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
              <strong className="text-orange-400">Up to 40% less than MarginEdge.</strong>
            </p>
            
            {/* Competitive Comparison */}
            <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mx-auto mb-12 border border-orange-500/20">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-2">Compare to MarginEdge</div>
                <div className="flex items-center justify-center space-x-8">
                  <div>
                    <div className="text-2xl font-bold text-red-400 line-through">$330/mo</div>
                    <div className="text-xs text-slate-400">MarginEdge</div>
                  </div>
                  <div className="text-orange-400 text-2xl">→</div>
                  <div>
                    <div className="text-2xl font-bold text-green-400">$149/mo</div>
                    <div className="text-xs text-slate-400">RestroFlow Pro</div>
                  </div>
                </div>
                <div className="text-sm text-orange-300 mt-3 font-semibold">Save $2,172 per year per location</div>
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

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 pb-20">
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
                          <span className="text-4xl font-black text-white">${plan.price}</span>
                          <span className="text-slate-400 ml-2">/{plan.period.split('/')[1]}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">{plan.period.split('/')[0]}</div>
                        {plan.savings && (
                          <div className="text-xs text-green-400 mt-2 font-semibold">
                            Save ${330 - plan.price}/mo {plan.savings}
                          </div>
                        )}
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

        {/* FAQ Section */}
        <section className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-12">Frequently Asked Questions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How does the free trial work?</h3>
                <p className="text-slate-300 text-sm">Start with any plan for 14 days completely free. No credit card required. Full access to all features.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Can I change plans anytime?</h3>
                <p className="text-slate-300 text-sm">Yes! Upgrade or downgrade your plan at any time. Changes take effect immediately on your next billing cycle.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">What POS systems do you integrate with?</h3>
                <p className="text-slate-300 text-sm">We integrate with major POS systems including Toast, Square, Clover, SpotOn, and many others.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Is there a setup fee?</h3>
                <p className="text-slate-300 text-sm">No setup fees ever. We'll help you get started with free onboarding and training sessions.</p>
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