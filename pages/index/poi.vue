<script setup>
const currentPOI = useCurrentPOI();

function getCategoryName(category) {
  if (category >= 10 && category <= 13) 
return "Nuraghe";
  if (category === 20 || category === 21) 
return "Dolmen";
  if (category === 30) 
return "Domus de janas";
  if (category === 40 || category === 41) 
return "Villaggi";
  if (category >= 50 && category <= 52) 
return "Culto dell'acqua";
  if (category >= 60 && category <= 63) 
return "Tombe dei giganti";
  if (category >= 70 && category <= 73) 
return "Menhir";
  if (category === 110 || category === 101) 
return "Unicum e Grotte Tafoni";
  return "Sconosciuto";
}

function getCategoryColor(category) {
  if (category >= 10 && category <= 13) 
return "bg-[#312528]";
  if (category === 20 || category === 21) 
return "bg-[#a89e46]";
  if (category === 30) 
return "bg-[#bc7b77]";
  if (category === 40 || category === 41) 
return "bg-[#fbce02]";
  if (category >= 50 && category <= 52) 
return "bg-[#4d8fc3]";
  if (category >= 60 && category <= 63) 
return "bg-[#a96f47]";
  if (category >= 70 && category <= 73) 
return "bg-[#fe8535]";
  if (category === 110 || category === 101) 
return "bg-[#aaaba8]";
  return "bg-red-500";
}
</script>

<template>
  <div v-if="currentPOI?.values_" class="m-4 flex flex-col gap-y-2">
    <div class="flex justify-between">
      <p class="text-xl font-bold">{{ currentPOI.values_.name }}</p>
      <NuxtLink
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-400 text-sm text-white"
        to="/"
      >
        X
      </NuxtLink>
    </div>

    <div
      v-if="!currentPOI.values_.validato"
      class="flex items-center justify-between gap-x-2 rounded-lg bg-amber-300 p-1.5"
    >
      <p
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xl font-bold text-amber-300"
      >
        !
      </p>
      <p class="text-xs text-amber-900">
        Non verificato. Le informazioni potrebbero non essere accurate.
      </p>
    </div>

    <div class="flex gap-x-2">
      <div
        class="flex w-full items-center gap-x-2 rounded-lg px-2 py-4 text-gray-100"
        :class="getCategoryColor(Number(currentPOI.values_.category))"
      >
        <p
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/50 text-2xl font-bold mix-blend-lighten"
        >
          <IconChecked class="h-5 w-5 fill-gray-100" />
        </p>
        <p class="flex flex-col text-xs font-semibold">
          Tipo
          <span class="text-sm">{{
            getCategoryName(Number(currentPOI.values_.category))
          }}</span>
        </p>
      </div>

      <div
        class="flex w-full items-center gap-x-2 rounded-lg bg-slate-500 fill-gray-100 p-2 text-gray-100"
      >
        <p
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-400 text-2xl font-bold"
        >
          <IconHidden
            v-if="currentPOI.values_.stato.toLowerCase() === 'non visibile'"
            class="h-5 w-5"
          />
          <IconChecked
            v-else-if="
              currentPOI.values_.stato.toLowerCase() === 'manutenuto' ||
              currentPOI.values_.stato.toLowerCase() === 'mantenuto' ||
              currentPOI.values_.stato.toLowerCase() === 'buono'
            "
            class="h-5 w-5"
          />
          <span v-else>?</span>
        </p>
        <p class="flex flex-col text-sm font-semibold">
          <span class="text-xs">Stato</span
          >{{ currentPOI.values_.stato || "Sconosciuto" }}

          <!--
                Mantenuto
                Buono
                Non Visibile
                Diroccato


                Sconosciuto
              -->
        </p>
      </div>
    </div>

    <div class="mb-4 grid grid-cols-2">
      <p class="flex flex-col text-lg font-semibold">
        <span class="text-sm text-slate-700">Comune</span
        >{{ currentPOI.values_.comune }}
      </p>

      <p class="flex flex-col text-lg font-semibold">
        <span class="text-sm text-slate-700">Localita</span
        >{{ currentPOI.values_.localita }}
      </p>

      <p class="flex flex-col text-lg font-semibold">
        <span class="text-sm text-slate-700">Fonte</span
        >{{ currentPOI.values_.fonte }}
      </p>
    </div>
    <p class="self-center text-sm text-slate-700">
      Aggiunto il
      {{
        useDateFormat(
          new Date(currentPOI.values_.date),
          "DD/MM/YYYY"
        ).value.replace('"', "")
      }}
    </p>
  </div>
</template>
