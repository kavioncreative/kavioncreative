import React from 'react';
import { Modal } from './Surfaces';
import { LabelManager } from './LabelManager';
import Button from './Button';

interface LabelManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'applicant' | 'project';
    targetId?: string;
    onLabelsChange?: () => void;
}

export const LabelManagerModal: React.FC<LabelManagerModalProps> = ({ isOpen, onClose, type, targetId, onLabelsChange }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={targetId ? `Tag ${type === 'project' ? 'Project' : 'Applicant'}` : "Manage Labels"}
            size="md"
        >
            <div className="p-1">
                <LabelManager type={type} targetId={targetId} onLabelsChange={onLabelsChange} />
            </div>

            <div className="mt-8 flex justify-end">
                <Button
                    variant="recessed"
                    onClick={onClose}
                    className="px-8 h-12 font-black uppercase tracking-widest text-xs"
                >
                    Close
                </Button>
            </div>
        </Modal>
    );
};
