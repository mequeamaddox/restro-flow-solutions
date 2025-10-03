import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Clock, Shield, Users, AlertTriangle, Heart } from "lucide-react";

export default function EmployeeHandbook() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">RestroFlow Employee Handbook</h1>
        </div>
        <p className="text-muted-foreground">Your comprehensive guide to working at RestroFlow restaurants</p>
      </div>

      <div className="grid gap-6">
        {/* Welcome Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Welcome to Our Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Welcome to RestroFlow! We're excited to have you as part of our team. This handbook contains 
              important information about our company policies, procedures, and culture.
            </p>
            <p>
              Our mission is to provide exceptional dining experiences while creating a positive, supportive 
              work environment for our team members. Your success is our success!
            </p>
          </CardContent>
        </Card>

        {/* Employment Basics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Employment Basics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Work Schedule</h4>
              <p className="text-muted-foreground">
                Your work schedule is posted weekly. Check your schedule regularly and notify management 
                of any conflicts at least 48 hours in advance.
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">Dress Code & Appearance</h4>
              <p className="text-muted-foreground">
                Professional appearance is required at all times. Uniform shirts will be provided. 
                Closed-toe shoes, clean appearance, and minimal jewelry required.
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Attendance Policy</h4>
              <p className="text-muted-foreground">
                Punctuality is essential. Notify your manager immediately if you will be late or absent. 
                Excessive tardiness or unexcused absences may result in disciplinary action.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Safety & Food Handling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Safety & Food Handling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Food Safety</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Wash hands frequently and properly (20+ seconds with soap)</li>
                <li>• Use gloves when handling ready-to-eat foods</li>
                <li>• Maintain proper food temperatures at all times</li>
                <li>• Follow FIFO (First In, First Out) rotation procedures</li>
                <li>• Report any food safety concerns immediately</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Workplace Safety</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Keep walkways clear and clean up spills immediately</li>
                <li>• Use proper lifting techniques for heavy items</li>
                <li>• Report all accidents and injuries to management</li>
                <li>• Know location of fire extinguishers and emergency exits</li>
                <li>• Follow proper procedures for chemical storage and handling</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Customer Service */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-purple-500" />
              Customer Service Standards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Service Excellence</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Greet every guest with a genuine smile and warm welcome</li>
                <li>• Be knowledgeable about menu items, ingredients, and preparation methods</li>
                <li>• Anticipate guest needs and provide proactive service</li>
                <li>• Handle complaints professionally and escalate to management when needed</li>
                <li>• Thank guests for their visit and invite them to return</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Technology & Systems */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Technology & Time Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">POS Systems</h4>
              <p className="text-muted-foreground">
                We use SpotOn POS at our bar location and Clover at our main restaurant. 
                Proper training will be provided on your assigned system.
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Time Clock</h4>
              <p className="text-muted-foreground">
                Clock in and out using the employee portal. Breaks must be taken as scheduled, 
                and all time adjustments require manager approval.
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Employee Portal</h4>
              <p className="text-muted-foreground">
                Use the employee portal to view your schedule, complete required documents, 
                access build sheets, and communicate with your team.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Important Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Zero Tolerance Policies</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• No alcohol or drug use on premises</li>
                <li>• No harassment or discrimination of any kind</li>
                <li>• No theft of company or customer property</li>
                <li>• No sharing of confidential company information</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Progressive Discipline</h4>
              <p className="text-muted-foreground">
                We believe in coaching and development. Most issues will be addressed through 
                verbal coaching, written warnings, and final warnings before termination.
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">Equal Opportunity</h4>
              <p className="text-muted-foreground">
                RestroFlow provides equal employment opportunities regardless of race, color, 
                religion, gender, sexual orientation, age, national origin, disability, or veteran status.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Questions or Concerns?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              If you have questions about any policies in this handbook, please speak with your 
              direct supervisor or HR. We're here to help you succeed!
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              This handbook is subject to change. You will be notified of any policy updates.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}