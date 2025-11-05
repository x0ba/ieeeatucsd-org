import React, { useState } from 'react';
import { Plus, Edit, Trash2, Building2, Shield } from 'lucide-react';
import { useSponsorDomains } from '../hooks/useSponsorDomains';
import type { SponsorDomainWithId } from '../hooks/useSponsorDomains';
import SponsorDomainModal from './SponsorDomainModal';
import { Spinner } from '@heroui/react';

interface SponsorDomainsSectionProps {
    isAdmin: boolean;
}

export default function SponsorDomainsSection({ isAdmin }: SponsorDomainsSectionProps) {
    const {
        domains,
        loading,
        addDomain,
        updateDomain,
        deleteDomain,
    } = useSponsorDomains();

    const [showModal, setShowModal] = useState(false);
    const [editingDomain, setEditingDomain] = useState<SponsorDomainWithId | null>(null);
    const [deletingDomainId, setDeletingDomainId] = useState<string | null>(null);

    const handleAddClick = () => {
        setEditingDomain(null);
        setShowModal(true);
    };

    const handleEditClick = (domain: SponsorDomainWithId) => {
        setEditingDomain(domain);
        setShowModal(true);
    };

    const handleSave = async (formData: { domain: string; organizationName: string; sponsorTier: any }) => {
        if (editingDomain) {
            await updateDomain(editingDomain.id, formData);
        } else {
            await addDomain(formData);
        }

        setShowModal(false);
        setEditingDomain(null);
    };

    const handleDelete = async (domainId: string) => {
        if (window.confirm('Are you sure you want to delete this sponsor domain? Users with this domain will no longer be auto-assigned as sponsors.')) {
            await deleteDomain(domainId);
            setDeletingDomainId(null);
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Diamond':
                return 'bg-cyan-100 text-cyan-800';
            case 'Platinum':
                return 'bg-gray-100 text-gray-800';
            case 'Gold':
                return 'bg-yellow-100 text-yellow-800';
            case 'Silver':
                return 'bg-slate-100 text-slate-800';
            case 'Bronze':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (!isAdmin) {
        return null; // Only show to administrators
    }

    return (
        <div className="bg-white rounded-2xl shadow">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Sponsor Domain Auto-Detection</h3>
                            <p className="text-sm text-gray-500">
                                Configure email domains for automatic sponsor assignment
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        Add Domain
                    </button>
                </div>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="text-center py-8">
                        <Spinner size="lg" color="primary" />
                        <p className="mt-2 text-sm text-gray-500">Loading sponsor domains...</p>
                    </div>
                ) : domains.length === 0 ? (
                    <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No sponsor domains configured</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Add a domain to automatically assign sponsor status to users with matching email addresses
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Domain
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Organization
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tier
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {domains.map((domain) => (
                                    <tr key={domain.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-mono text-gray-900">{domain.domain}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900">{domain.organizationName}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTierColor(domain.sponsorTier)}`}>
                                                {domain.sponsorTier}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(domain)}
                                                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                                    title="Edit domain"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(domain.id)}
                                                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                                    title="Delete domain"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            <SponsorDomainModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingDomain(null);
                }}
                onSave={handleSave}
                editingDomain={editingDomain}
                loading={loading}
            />
        </div>
    );
}

