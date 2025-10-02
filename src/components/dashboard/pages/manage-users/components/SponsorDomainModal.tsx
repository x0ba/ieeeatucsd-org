import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { SponsorTier } from '../../../shared/types/firestore';
import type { SponsorDomainWithId } from '../hooks/useSponsorDomains';

interface SponsorDomainModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { domain: string; organizationName: string; sponsorTier: SponsorTier }) => void;
    editingDomain: SponsorDomainWithId | null;
    loading?: boolean;
}

const SPONSOR_TIERS: SponsorTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

export default function SponsorDomainModal({
    isOpen,
    onClose,
    onSave,
    editingDomain,
    loading = false
}: SponsorDomainModalProps) {
    const [formData, setFormData] = useState({
        domain: '',
        organizationName: '',
        sponsorTier: 'Bronze' as SponsorTier
    });

    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (editingDomain) {
                setFormData({
                    domain: editingDomain.domain,
                    organizationName: editingDomain.organizationName,
                    sponsorTier: editingDomain.sponsorTier
                });
            } else {
                setFormData({
                    domain: '',
                    organizationName: '',
                    sponsorTier: 'Bronze'
                });
            }
            setValidationError(null);
        }
    }, [isOpen, editingDomain]);

    const validateDomain = (domain: string): string | null => {
        if (!domain) {
            return 'Domain is required';
        }
        if (!domain.startsWith('@')) {
            return 'Domain must start with @';
        }
        if (domain.length < 3) {
            return 'Domain must have at least one character after @';
        }
        // Check for valid domain format (basic validation)
        const domainPart = domain.substring(1);
        if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domainPart)) {
            return 'Invalid domain format (e.g., @example.com)';
        }
        return null;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate domain
        const domainError = validateDomain(formData.domain);
        if (domainError) {
            setValidationError(domainError);
            return;
        }

        // Validate organization name
        if (!formData.organizationName.trim()) {
            setValidationError('Organization name is required');
            return;
        }

        setValidationError(null);
        onSave(formData);
    };

    const handleDomainChange = (value: string) => {
        // Auto-add @ if not present
        let processedValue = value.trim();
        if (processedValue && !processedValue.startsWith('@')) {
            processedValue = '@' + processedValue;
        }
        setFormData({ ...formData, domain: processedValue });
        setValidationError(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        {editingDomain ? 'Edit Sponsor Domain' : 'Add Sponsor Domain'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={loading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {validationError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800">{validationError}</p>
                        </div>
                    )}

                    {/* Domain Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Domain *
                        </label>
                        <input
                            type="text"
                            value={formData.domain}
                            onChange={(e) => handleDomainChange(e.target.value)}
                            placeholder="@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                            required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Enter the email domain (e.g., @tsmc.com, @qualcomm.com)
                        </p>
                    </div>

                    {/* Organization Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Organization Name *
                        </label>
                        <input
                            type="text"
                            value={formData.organizationName}
                            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                            placeholder="TSMC"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Sponsor Tier Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sponsor Tier *
                        </label>
                        <select
                            value={formData.sponsorTier}
                            onChange={(e) => setFormData({ ...formData, sponsorTier: e.target.value as SponsorTier })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                            required
                        >
                            {SPONSOR_TIERS.map((tier) => (
                                <option key={tier} value={tier}>
                                    {tier}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : editingDomain ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

