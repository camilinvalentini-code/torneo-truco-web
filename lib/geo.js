export const PAISES = [
  {
    codigo: "AR",
    nombre: "Argentina",
    provincias: [
      "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
      "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
      "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
      "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
      "Tierra del Fuego", "Tucumán",
    ],
  },
  // Cuando quieras sumar Uruguay, alcanza con descomentar esto — nada más
  // del código necesita cambiar, los selectores ya lo van a mostrar solo.
  // {
  //   codigo: "UY",
  //   nombre: "Uruguay",
  //   provincias: [
  //     "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno",
  //     "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
  //     "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José",
  //     "Soriano", "Tacuarembó", "Treinta y Tres",
  //   ],
  // },
];

export function provinciasDe(codigoPais) {
  return PAISES.find((p) => p.codigo === codigoPais)?.provincias || [];
}
