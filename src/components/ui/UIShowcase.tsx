import { useState } from 'react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Spinner } from './Spinner';

/**
 * Showcase de todos los componentes UI para validación visual
 * 
 * Para ver este showcase, importa este componente en App.tsx temporalmente:
 * import { UIShowcase } from './components/ui/UIShowcase';
 * 
 * Y renderízalo: <UIShowcase />
 */
export function UIShowcase() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [selectValue, setSelectValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadingDemo = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        🎨 UI Components Showcase
                    </h1>
                    <p className="text-gray-600">
                        Validación visual de todos los componentes UI base del sistema OMS
                    </p>
                </div>

                {/* Buttons */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        Buttons
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Variants</h3>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary">Primary Button</Button>
                                <Button variant="secondary">Secondary Button</Button>
                                <Button variant="outline">Outline Button</Button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">States</h3>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="primary" disabled>
                                    Disabled
                                </Button>
                                <Button variant="primary" loading={isLoading} onClick={handleLoadingDemo}>
                                    {isLoading ? 'Loading...' : 'Click to Load'}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Types</h3>
                            <div className="flex flex-wrap gap-3">
                                <Button type="button">Button Type</Button>
                                <Button type="submit">Submit Type</Button>
                                <Button type="reset">Reset Type</Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Badges */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Badges</h2>
                    <div className="flex flex-wrap gap-3">
                        <Badge color="blue">Nuevo</Badge>
                        <Badge color="yellow">Preparando</Badge>
                        <Badge color="green">Listo</Badge>
                        <Badge color="gray">Enviado</Badge>
                        <Badge color="red">Cancelado</Badge>
                        <Badge color="purple">Wix</Badge>
                    </div>
                </section>

                {/* Spinners */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Spinners</h2>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <Spinner size="sm" />
                            <span className="text-xs text-gray-600">Small</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Spinner size="md" />
                            <span className="text-xs text-gray-600">Medium</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Spinner size="lg" />
                            <span className="text-xs text-gray-600">Large</span>
                        </div>
                    </div>
                </section>

                {/* Input */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Input</h2>
                    <div className="max-w-md space-y-4">
                        <Input
                            label="Buscar orden"
                            value={inputValue}
                            onChange={setInputValue}
                            placeholder="Ingresa ID o nombre del cliente..."
                        />
                        <Input
                            label="Email"
                            type="email"
                            value=""
                            onChange={() => { }}
                            placeholder="ejemplo@correo.com"
                        />
                        <Input
                            label="Input deshabilitado"
                            value="No editable"
                            onChange={() => { }}
                            disabled
                        />
                    </div>
                </section>

                {/* Select */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Select</h2>
                    <div className="max-w-md space-y-4">
                        <Select
                            label="Estado de la orden"
                            value={selectValue}
                            onChange={setSelectValue}
                            options={[
                                { value: '', label: 'Todos los estados' },
                                { value: 'nuevo', label: 'Nuevo' },
                                { value: 'preparando', label: 'Preparando' },
                                { value: 'listo', label: 'Listo' },
                                { value: 'enviado', label: 'Enviado' },
                                { value: 'cancelado', label: 'Cancelado' },
                            ]}
                        />
                        <Select
                            label="Canal de venta"
                            value=""
                            onChange={() => { }}
                            options={[
                                { value: '', label: 'Todos los canales' },
                                { value: 'mercadolibre', label: 'Mercado Libre' },
                                { value: 'wix', label: 'Wix' },
                            ]}
                        />
                        <Select
                            label="Select deshabilitado"
                            value="opcion1"
                            onChange={() => { }}
                            options={[
                                { value: 'opcion1', label: 'Opción 1' },
                                { value: 'opcion2', label: 'Opción 2' },
                            ]}
                            disabled
                        />
                    </div>
                </section>

                {/* Modal */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modal</h2>
                    <Button onClick={() => setIsModalOpen(true)}>Abrir Modal</Button>

                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        title="Ejemplo de Modal"
                    >
                        <div className="space-y-4">
                            <p className="text-gray-700">
                                Este es un modal de ejemplo. Puedes cerrarlo de las siguientes formas:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 space-y-1">
                                <li>Presionando la tecla ESC</li>
                                <li>Haciendo click en el botón X</li>
                                <li>Haciendo click fuera del modal (en el overlay oscuro)</li>
                            </ul>
                            <div className="pt-4 border-t border-gray-200">
                                <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                                    Cerrar Modal
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </section>

                {/* Combined Example */}
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                        Ejemplo Combinado
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge color="blue">Orden #12345</Badge>
                            <Badge color="yellow">Mercado Libre</Badge>
                        </div>
                        <Input
                            label="Notas de la orden"
                            value=""
                            onChange={() => { }}
                            placeholder="Agregar notas..."
                        />
                        <Select
                            label="Cambiar estado"
                            value=""
                            onChange={() => { }}
                            options={[
                                { value: 'nuevo', label: 'Nuevo' },
                                { value: 'preparando', label: 'Preparando' },
                                { value: 'listo', label: 'Listo' },
                            ]}
                        />
                        <div className="flex gap-3">
                            <Button variant="primary">Guardar Cambios</Button>
                            <Button variant="outline">Cancelar</Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
