import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  CreditCard,
  Users,
  ChevronLeft,
  FileText,
  Eye,
  EyeOff
} from "lucide-react";
import { Link } from "wouter";

interface EmployeeProfile {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    department: string;
    status: string;
    hireDate: string;
    locationId: string;
  };
  onboardingData?: {
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    dateOfBirth?: string;
    socialSecurityNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelationship?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    accountType?: string;
    completedAt?: string;
  };
}

export default function EmployeePage() {
  const [, params] = useRoute("/employees/:id");
  const employeeId = params?.id;
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const { data: profileData, isLoading, error } = useQuery<EmployeeProfile>({
    queryKey: ["/api/employees", employeeId, "profile"],
    enabled: !!employeeId,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Employee Not Found</h3>
            <p className="text-gray-600 mb-4">
              We couldn't find the employee profile you're looking for.
            </p>
            <Link href="/employees">
              <Button variant="outline">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Employees
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { employee, onboardingData } = profileData;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/employees">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Employees
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-600">{employee.position} • {employee.department}</p>
          </div>
        </div>
        <Badge className={getStatusColor(employee.status)}>
          {employee.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Email:</span>
              <span className="text-sm">{employee.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Hire Date:</span>
              <span className="text-sm">{formatDate(employee.hireDate)}</span>
            </div>
            {onboardingData?.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Phone:</span>
                <span className="text-sm">{onboardingData.phone}</span>
              </div>
            )}
            {onboardingData?.dateOfBirth && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Date of Birth:</span>
                <span className="text-sm">{formatDate(onboardingData.dateOfBirth)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Information */}
        {onboardingData && (onboardingData.address || onboardingData.city || onboardingData.state) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {onboardingData.address && (
                <p className="text-sm">{onboardingData.address}</p>
              )}
              {(onboardingData.city || onboardingData.state || onboardingData.zipCode) && (
                <p className="text-sm">
                  {[onboardingData.city, onboardingData.state, onboardingData.zipCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {onboardingData && (onboardingData.emergencyContactName || onboardingData.emergencyContactPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Emergency Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {onboardingData.emergencyContactName && (
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="text-sm font-medium">{onboardingData.emergencyContactName}</p>
                </div>
              )}
              {onboardingData.emergencyContactPhone && (
                <div>
                  <span className="text-sm text-gray-600">Phone:</span>
                  <p className="text-sm">{onboardingData.emergencyContactPhone}</p>
                </div>
              )}
              {onboardingData.emergencyContactRelationship && (
                <div>
                  <span className="text-sm text-gray-600">Relationship:</span>
                  <p className="text-sm">{onboardingData.emergencyContactRelationship}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Banking Information - Sensitive Data */}
        {onboardingData && (onboardingData.bankName || onboardingData.accountNumber) && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Banking Information</span>
                  <Shield className="w-4 h-4 text-amber-500" />
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSensitiveData(!showSensitiveData)}
                  data-testid="toggle-sensitive-data"
                >
                  {showSensitiveData ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Show Details
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {onboardingData.bankName && (
                  <div>
                    <span className="text-sm text-gray-600">Bank Name:</span>
                    <p className="text-sm font-medium">{onboardingData.bankName}</p>
                  </div>
                )}
                {onboardingData.accountType && (
                  <div>
                    <span className="text-sm text-gray-600">Account Type:</span>
                    <p className="text-sm">{onboardingData.accountType}</p>
                  </div>
                )}
                {onboardingData.accountNumber && (
                  <div>
                    <span className="text-sm text-gray-600">Account Number:</span>
                    <p className="text-sm font-mono">
                      {showSensitiveData ? onboardingData.accountNumber : onboardingData.accountNumber}
                    </p>
                  </div>
                )}
                {onboardingData.routingNumber && (
                  <div>
                    <span className="text-sm text-gray-600">Routing Number:</span>
                    <p className="text-sm font-mono">
                      {showSensitiveData ? onboardingData.routingNumber : onboardingData.routingNumber}
                    </p>
                  </div>
                )}
              </div>
              
              {/* SSN if available */}
              {onboardingData.socialSecurityNumber && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <span className="text-sm text-gray-600">Social Security Number:</span>
                    <p className="text-sm font-mono">
                      {onboardingData.socialSecurityNumber}
                    </p>
                  </div>
                </>
              )}
              
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 flex items-start space-x-2">
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    This information is encrypted and secure. Access is logged for compliance purposes.
                    Only authorized personnel should view sensitive banking details.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Onboarding Completion Info */}
        {onboardingData?.completedAt && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Onboarding Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Completed:</span>
                  <span className="text-sm">{formatDate(onboardingData.completedAt)}</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Onboarding Complete
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}