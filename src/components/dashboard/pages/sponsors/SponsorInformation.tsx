import React from 'react';
import { Building2, Mail, Award, Check, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../../hooks/useAuth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../../../firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import type { User as FirestoreUser, SponsorTier } from '../../shared/types/firestore';
import DashboardHeader from '../../shared/DashboardHeader';

export default function SponsorInformation() {
    const { userRole } = useAuth();
    const [user] = useAuthState(auth);
    const [sponsorData, setSponsorData] = React.useState<Partial<FirestoreUser> | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchSponsorData = async () => {
            if (!user) return;

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setSponsorData(userDoc.data() as FirestoreUser);
                }
            } catch (error) {
                console.error('Error fetching sponsor data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSponsorData();
    }, [user]);

    if (loading) {
        return (
            <>
                <DashboardHeader
                    title="Sponsor Information"
                    subtitle="Your sponsorship details and benefits"
                    showSearch={false}
                />
                <div className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </>
        );
    }

    const getTierColor = (tier?: string) => {
        switch (tier) {
            case 'Diamond':
                return 'bg-cyan-100 text-cyan-800 border-cyan-200';
            case 'Platinum':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'Gold':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Silver':
                return 'bg-slate-100 text-slate-800 border-slate-200';
            case 'Bronze':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getTierAmount = (tier?: string) => {
        switch (tier) {
            case 'Diamond':
                return '$5000+';
            case 'Platinum':
                return '$4000';
            case 'Gold':
                return '$3000';
            case 'Silver':
                return '$1500';
            case 'Bronze':
                return '$750';
            default:
                return 'N/A';
        }
    };

    interface Benefit {
        name: string;
        bronze: boolean | string;
        silver: boolean | string;
        gold: boolean | string;
    }

    const benefits: Benefit[] = [
        { name: 'Prominent Logo Placement on Website & Newsletters', bronze: true, silver: true, gold: true },
        { name: 'Tabling/Swag at Major Events', bronze: true, silver: true, gold: true },
        { name: 'Exclusive Access to Student Resume Database', bronze: false, silver: true, gold: true },
        { name: 'Participation in Professional Development Sessions', bronze: false, silver: '3 per year', gold: 'Unlimited' },
        { name: 'Participation in Technical Workshops', bronze: false, silver: '1 per year', gold: 'Unlimited' },
        { name: 'Unlimited Participation in Quarterly Projects', bronze: false, silver: false, gold: true },
        { name: 'Custom Events & Activations', bronze: false, silver: false, gold: true },
    ];

    const renderBenefitIcon = (value: boolean | string) => {
        if (value === true) {
            return <Check className="w-5 h-5 text-green-600" />;
        } else if (value === false) {
            return <X className="w-5 h-5 text-gray-400" />;
        } else {
            return <ArrowRight className="w-5 h-5 text-blue-600" />;
        }
    };

    return (
        <>
            <DashboardHeader
                title="Sponsor Information"
                subtitle="Your sponsorship details and benefits"
                showSearch={false}
            />
            <div className="p-6 space-y-6">
                {/* Welcome Card */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white/20 rounded-lg">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Welcome, {sponsorData?.sponsorOrganization || 'Sponsor'}!</h2>
                            <p className="text-blue-100 mt-1">Thank you for supporting IEEE at UC San Diego</p>
                        </div>
                    </div>
                </div>

                {/* Sponsor Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Organization Info */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Organization Details</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500">Organization Name</p>
                                <p className="text-base font-medium text-gray-900">
                                    {sponsorData?.sponsorOrganization || 'Not specified'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Contact Email</p>
                                <p className="text-base font-medium text-gray-900">{sponsorData?.email || 'Not specified'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sponsorship Tier */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Award className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Sponsorship Tier</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500 mb-2">Current Tier</p>
                                <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full border ${getTierColor(sponsorData?.sponsorTier)}`}>
                                    {sponsorData?.sponsorTier || 'Not assigned'}
                                </span>
                            </div>
                            {sponsorData?.autoAssignedSponsor && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-800">
                                        ✓ Automatically assigned based on email domain
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Sponsorship Benefits Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Award className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Sponsorship Benefits by Tier</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Benefit
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex flex-col items-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor('Bronze')}`}>
                                                Bronze
                                            </span>
                                            <span className="text-gray-600 mt-1">{getTierAmount('Bronze')}</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex flex-col items-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor('Silver')}`}>
                                                Silver
                                            </span>
                                            <span className="text-gray-600 mt-1">{getTierAmount('Silver')}</span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex flex-col items-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTierColor('Gold')}`}>
                                                Gold
                                            </span>
                                            <span className="text-gray-600 mt-1">{getTierAmount('Gold')}</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {benefits.map((benefit, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {benefit.name}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {renderBenefitIcon(benefit.bronze)}
                                                {typeof benefit.bronze === 'string' && (
                                                    <span className="text-xs text-blue-600 font-medium">{benefit.bronze}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {renderBenefitIcon(benefit.silver)}
                                                {typeof benefit.silver === 'string' && (
                                                    <span className="text-xs text-blue-600 font-medium">{benefit.silver}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {renderBenefitIcon(benefit.gold)}
                                                {typeof benefit.gold === 'string' && (
                                                    <span className="text-xs text-blue-600 font-medium">{benefit.gold}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {sponsorData?.sponsorTier && (
                        <div className="p-4 bg-blue-50 border-t border-blue-200">
                            <p className="text-sm text-blue-800 text-center">
                                <strong>Your current tier: {sponsorData.sponsorTier}</strong> - You have access to all benefits marked with ✓ or ➡️ in the {sponsorData.sponsorTier} column
                            </p>
                        </div>
                    )}
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Mail className="w-5 h-5 text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Need Help?</h3>
                    </div>
                    <p className="text-gray-600 mb-4">
                        If you have any questions about your sponsorship or need assistance accessing the resume database,
                        please contact our team.
                    </p>
                    <div className="flex gap-4">
                        <a
                            href="mailto:ieee@ucsd.edu"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            Contact IEEE UCSD
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}

