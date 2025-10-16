import React, { useState } from 'react';
import { Send, Eye } from 'lucide-react';
import { Card, CardBody, Input, Select, SelectItem, Textarea, Button, Spacer, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import type { UserRole } from '../../../shared/types/firestore';
import type { DirectOnboardingFormData } from '../types/OnboardingTypes';

interface DirectOnboardingTabProps {
    onSendOnboarding: (data: DirectOnboardingFormData) => Promise<void>;
    loading: boolean;
}

const OFFICER_ROLES: UserRole[] = [
    'General Officer',
    'Executive Officer',
];

// Default email template from temp.txt
const DEFAULT_EMAIL_TEMPLATE = `Hello {NAME}!

Congratulations on being elected as the new {POSITION} for IEEE at UC San Diego! There is a lot of information to get started but it is fairly quick and straightforward. Please read this email in its entirety. If you have any problems feel free to ask me or any of the other officers! 

1. Contact Info

Our primary forms of communication are through Slack, Google Groups, Google Drive, and Google Sites. In order to be added to these lists, please input your contact information onto this document. Once you fill out your information on this document (https://docs.google.com/spreadsheets/d/1XTaiDNwJqFelR_w3v_vvptxxLQGcEfI0Fl3bf7cDGS8/edit?gid=0#gid=0), please respond to this email confirming that, as we need this information for some of the following tasks.

2. Join IEEE

Go to http://ieee.org/join and join IEEE as a student member. Be sure to list UC San Diego as your affiliated branch. The cost is $32 / year. IEEE is our parent organization and our constitution states that all officers must be members of IEEE.

3. Join the Dashboard and Slack

Your role should have been updated on our Dashboard to a general officer, if it hasn't please let me know as soon as possible. Once on the dashboard, please go into the tab labeled "Slack Access" and follow the instructions to gain access to your IEEE email for slack. 

Here is some information about Slack if you have not used it in the past: 

I. Slack is a popular cloud-based team collaboration tool that allows members to have real-time chatting and document sharing under different topics (called "channels" in Slack). After your first login, you should find out a list of channels, and please consult your mentor or executive board officers regarding which channels you should join. {LEADER_INFO}

You should definitely join channels such as "#-announcements", "#-executive", "#-events",  "#-internal", "#-projects", "#-pr", "#-outreach", and "#z_play" in order to establish your initial connection with the whole team. Please also put your position in your Slack Profile and add a picture!

II. If you are new to Slack, please follow the tutorial that should pop out after your first login. You may also familiarize yourself with Slack by checking out this page. It is required that you should install the Slack Mobile App to your cell phone with your account logged on so that you are reachable by all other officers. Slack Desktop App is also nice to have.

III. After you download Slack, make sure to change these settings:
	a. "Notify me about…" —> Select "All new messages"
	b. Check the box labeled "Notify me about replies to threads I'm following"
	c. Notification Schedule —> Every day, 00:00 to Midnight
	d. "When I'm inactive on desktop" —> "Send notifications to my mobile devices" —> Select "as soon as I'm inactive"

4. Position Email

After you're on Slack, we will provide you access with your Positions email that provides access to all documents and files we will be using within the organization throughout the year. 

5. Read Slack and your email frequently. Good communication is key. Please try to be responsive.

Once you join these groups, you will receive information on weekly meetings with your subgroups (Internal, Events, Project) for the rest of the quarter as well as further onboarding information for your position. 

{CUSTOM_MESSAGE}

Once again, congratulations on this position and we're all so excited to have you on our board! We'll be here to support you in every step of the way so feel free to ask any questions and get as much clarification as you need.`;

export default function DirectOnboardingTab({ onSendOnboarding, loading }: DirectOnboardingTabProps) {
    const [formData, setFormData] = useState<DirectOnboardingFormData>({
        name: '',
        email: '',
        role: 'General Officer',
        position: '',
        leaderName: '',
        customMessage: '',
        emailTemplate: DEFAULT_EMAIL_TEMPLATE,
    });
    const [showPreview, setShowPreview] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSendOnboarding(formData);
        
        // Reset form on success
        setFormData({
            name: '',
            email: '',
            role: 'General Officer',
            position: '',
            leaderName: '',
            customMessage: '',
            emailTemplate: DEFAULT_EMAIL_TEMPLATE,
        });
    };

    const getPreviewEmail = () => {
        let preview = formData.emailTemplate;
        preview = preview.replace(/{NAME}/g, formData.name || '[Name]');
        preview = preview.replace(/{POSITION}/g, formData.position || '[Position]');
        
        const leaderInfo = formData.leaderName 
            ? `The Vice Chair you'll be working with throughout the year will be ${formData.leaderName}.`
            : '';
        preview = preview.replace(/{LEADER_INFO}/g, leaderInfo);
        
        const customMsg = formData.customMessage 
            ? `\n\n${formData.customMessage}\n`
            : '';
        preview = preview.replace(/{CUSTOM_MESSAGE}/g, customMsg);
        
        return preview;
    };

    return (
        <div className="max-w-4xl">
            <Card>
                <CardBody className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Direct Officer Onboarding</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Directly onboard an officer without requiring acceptance. The onboarding email will be sent immediately,
                            and they will be added to the appropriate Google Group.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                type="text"
                                label="Full Name"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                isRequired
                                classNames={{
                                    inputWrapper: "rounded-lg"
                                }}
                            />

                            <Input
                                type="email"
                                label="Email Address"
                                placeholder="john.doe@ucsd.edu"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                isRequired
                                classNames={{
                                    inputWrapper: "rounded-lg"
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Officer Role"
                                placeholder="Select role"
                                selectedKeys={[formData.role]}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                isRequired
                                classNames={{
                                    trigger: "rounded-lg"
                                }}
                            >
                                {OFFICER_ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </Select>

                            <Input
                                type="text"
                                label="Position"
                                placeholder="e.g., Webmaster, President"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                isRequired
                                classNames={{
                                    inputWrapper: "rounded-lg"
                                }}
                            />
                        </div>

                        <Input
                            type="text"
                            label="Vice Chair / Mentor Name (Optional)"
                            placeholder="e.g., Jane Smith"
                            value={formData.leaderName}
                            onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                            classNames={{
                                inputWrapper: "rounded-lg"
                            }}
                        />

                        <Textarea
                            label="Additional Custom Message (Optional)"
                            placeholder="Add any additional information to include in the email..."
                            value={formData.customMessage}
                            onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                            minRows={3}
                            classNames={{
                                inputWrapper: "rounded-lg"
                            }}
                        />

                        <Textarea
                            label="Email Template"
                            description="Customize the onboarding email. Use {NAME}, {POSITION}, {LEADER_INFO}, and {CUSTOM_MESSAGE} as placeholders."
                            value={formData.emailTemplate}
                            onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                            minRows={10}
                            classNames={{
                                inputWrapper: "rounded-lg"
                            }}
                        />

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-green-900 mb-2">What happens immediately?</h4>
                            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                                <li>Onboarding email will be sent with all necessary instructions</li>
                                <li>User will be added to the appropriate Google Group</li>
                                <li>Officer permissions will be granted in the system</li>
                                <li>No acceptance required - they are onboarded immediately</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="bordered"
                                onPress={() => setShowPreview(true)}
                                startContent={<Eye className="w-4 h-4" />}
                                className="rounded-lg"
                            >
                                Preview Email
                            </Button>
                            <Button
                                type="submit"
                                color="primary"
                                isLoading={loading}
                                startContent={!loading && <Send className="w-4 h-4" />}
                                className="rounded-lg"
                            >
                                {loading ? 'Sending...' : 'Send Onboarding Email'}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* Email Preview Modal */}
            <Modal 
                isOpen={showPreview} 
                onClose={() => setShowPreview(false)}
                size="3xl"
                scrollBehavior="inside"
            >
                <ModalContent>
                    <ModalHeader>
                        <h3 className="text-lg font-medium">Email Preview</h3>
                    </ModalHeader>
                    <ModalBody>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                                {getPreviewEmail()}
                            </pre>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            color="primary"
                            onPress={() => setShowPreview(false)}
                            className="rounded-lg"
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}

