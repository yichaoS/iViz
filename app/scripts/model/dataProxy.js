/*
 * Copyright (c) 2015 Memorial Sloan-Kettering Cancer Center.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS
 * FOR A PARTICULAR PURPOSE. The software and documentation provided hereunder
 * is on an 'as is' basis, and Memorial Sloan-Kettering Cancer Center has no
 * obligations to provide maintenance, support, updates, enhancements or
 * modifications. In no event shall Memorial Sloan-Kettering Cancer Center be
 * liable to any party for direct, indirect, special, incidental or
 * consequential damages, including lost profits, arising out of the use of this
 * software and its documentation, even if Memorial Sloan-Kettering Cancer
 * Center has been advised of the possibility of such damage.
 */

/*
 * This file is part of cBioPortal.
 *
 * cBioPortal is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author suny1@mskcc.org on 3/30/16.
 *
 * retriving results in JSON from web APIs and converting/assemble to iViz format
 *
 */

'use strict';
(function (iViz, $) {

  iViz.data = {};
  iViz.data.init = function(_callBackFunc, _studyIdArr, _inputSampleList, _inputPatientList) {

    var _result = {};
    //var PORTAL_INST_URL = window.location.protocol + "//" + window.location.host + "/" + window.location.pathname.split('/')[1];
    var PORTAL_INST_URL = "http://www.cbioportal.org/";

    // ---- ajax cascade ----
    var _ajaxSampleMeta = [], _ajaxPatientMeta = [],
      _ajaxSampleData = [], _ajaxPatientData = [],
      _ajaxPatient2SampleIdMappingObj = {}, _ajaxSample2PatientIdMappingObj = {},
      _ajaxMutationCountData = {}, _ajaxCnaFractionData = {},
      _ajaxGeneticProfiles = {}, _ajaxCnaData = {}, _ajaxMutGenesData = {},
      _sequencedSampleIds = [], _cnaSampleIds = [], _allSampleIds = [];

    function extractCaseLists(studyId,resp){
      if(resp) {
        var _lists = resp.split('\n');
        for(var i = 0; i < _lists.length; i++) {
          var _parts = _lists[i].split('\t');
          if(_parts.length < 5) continue;
          if (_parts[0] === studyId+"_sequenced") {
            _sequencedSampleIds = _sequencedSampleIds.concat(_parts[4].trim().split(' '));
          } else if (_parts[0] === studyId+"_cna") {
            _cnaSampleIds = _cnaSampleIds.concat(_parts[4].trim().split(' '));
          } else if (_parts[0] === studyId+"_all") {
            _allSampleIds = _allSampleIds.concat(_parts[4].trim().split(' '));
          }
        }

        //For efficient comparing, see StudyViewUtil.intersection
        _allSampleIds = _allSampleIds.sort();
        _sequencedSampleIds = _sequencedSampleIds.sort();
        _cnaSampleIds = _cnaSampleIds.sort();

      }
    }
    // patient clinical attribute meta
    $.when.apply($, _studyIdArr.map(function (_studyId) {
      return $.ajax({
        method: "POST",
        url: PORTAL_INST_URL + '/api/clinicalattributes/patients',
        data: {study_id: _studyId}
      });
    })).done(function () {

      var _results = [];
      if(_studyIdArr.length==1){
        _results = _results.concat(arguments[0]);
      }else{
        for (var i = 0; i < arguments.length; i++) {
          _results = _results.concat(arguments[i][0]);
        }
      }
      _ajaxPatientMeta = _ajaxPatientMeta.concat(_.uniq(_results, 'attr_id'));

      // sample clinical attribute meta
      $.when.apply($, _studyIdArr.map(function (_studyId) {
        return $.ajax({
          method: "POST",
          url: PORTAL_INST_URL + '/api/clinicalattributes/samples',
          data: {study_id: _studyId}
        });
      })).done(function () {
        var _results = [];
        if(_studyIdArr.length==1){
          _results = _results.concat(arguments[0]);
        }else{
          for (var i = 0; i < arguments.length; i++) {
            _results = _results.concat(arguments[i][0]);
          }
        }
        _ajaxSampleMeta = _.uniq(_results, 'attr_id');

        // patient clinical data
        $.when.apply($, _studyIdArr.map(function (_studyId) {

          return $.ajax({
            method: "POST",
            url: PORTAL_INST_URL + '/api/clinicaldata/patients',
            data: {study_id: _studyId, attribute_ids: _.pluck(_ajaxPatientMeta, 'attr_id').join(',')}
          });
        })).done(function () {
          var _results = [];
          if(_studyIdArr.length==1){
            _results = _results.concat(arguments[0]);
          }else{
            for (var i = 0; i < arguments.length; i++) {
              _results = _results.concat(arguments[i][0]);
            }
          }
          _ajaxPatientData = _results;

          // sample clinical data
          $.when.apply($, _studyIdArr.map(function (_studyId) {

            return $.ajax({
              method: "POST",
              url: PORTAL_INST_URL + '/api/clinicaldata/samples',
              data: {study_id: _studyId, attribute_ids: _.pluck(_ajaxSampleMeta, 'attr_id').join(',')}
            });
          })).done(function () {
            var _results = [];
            if(_studyIdArr.length==1){
              _results = _results.concat(arguments[0]);
            }else{
              for (var i = 0; i < arguments.length; i++) {
                _results = _results.concat(arguments[i][0]);
              }
            }
            _ajaxSampleData = _results;
            $.when.apply($, _studyIdArr.map(function (_studyId) {
              return $.ajax({
                method: "POST",
                url: PORTAL_INST_URL + '/webservice.do?',
                data: {cmd: 'getCaseLists', cancer_study_id: _studyId}
              });
            })).done(function () {
              if(_studyIdArr.length==1){
                // _caseLists = $.extend({}, JSON.parse(arguments[0]),
                // _caseLists);
                //console.log(arguments[0])
                extractCaseLists(_studyIdArr[0],arguments[0])
              }else{
                for (var i = 0; i < arguments.length; i++) {
                  //console.log(arguments[i][0])
                  extractCaseLists(_studyIdArr[i],arguments[i][0])
                  // _caseLists = $.extend({}, JSON.parse(arguments[i][0]),
                  // _caseLists);
                }
              }

              // id mapping
              $.when.apply($, _studyIdArr.map(function (_studyId) {
                return $.ajax({
                  method: "POST",
                  url: PORTAL_INST_URL + '/webservice.do?',
                  data: {cmd: 'getPatientSampleMapping', cancer_study_id: _studyId, case_set_id: _studyId + '_all'}
                });
              })).done(function () {
                if(_studyIdArr.length==1){
                  var tempMap_ = JSON.parse(arguments[0]);
                  var processedMap_ = {};
                  $.each(tempMap_,function(index,item){
                    processedMap_[index] = {}
                    processedMap_[index].sample_ids = item;
                    processedMap_[index].study_id = _studyIdArr[0];
                  });
                  _ajaxPatient2SampleIdMappingObj = $.extend({}, processedMap_, _ajaxPatient2SampleIdMappingObj);
                }else{
                  for (var i = 0; i < arguments.length; i++) {
                    var tempMap_ = JSON.parse(arguments[i][0]);
                    var processedMap_ = {};
                    $.each(tempMap_,function(index,item){
                      processedMap_[index] = {}
                      processedMap_[index].sample_ids = item;
                      processedMap_[index].study_id = _studyIdArr[i];
                    });
                    _ajaxPatient2SampleIdMappingObj = $.extend({}, processedMap_, _ajaxPatient2SampleIdMappingObj);
                  }
                }

                // get all genetic profiles for queried studies
                $.when.apply($, _studyIdArr.map(function (_studyId) {

                  return $.ajax({
                    method: "POST",
                    url: PORTAL_INST_URL + '/api/geneticprofiles',
                    data: {study_id: _studyId}
                  });
                })).done(function () {
                  var _results = [];
                  if(_studyIdArr.length==1){
                    _results = _results.concat(arguments[0]);
                  }else{
                    for (var i = 0; i < arguments.length; i++) {
                      _results = _results.concat(arguments[i][0]);
                    }
                  }
                  _ajaxGeneticProfiles = _results;

                  // mutation count
                  var _mutCountStudyIdArr = _.filter(_studyIdArr, function (_studyId) {
                    return $.inArray(_studyId + '_mutations', _.pluck(_ajaxGeneticProfiles, 'id')) !== -1;
                  });
                  $.when.apply($, _mutCountStudyIdArr.map(function (_studyId) {
                    return $.ajax({
                      method: "POST",
                      url: PORTAL_INST_URL + '/mutations.json?',
                      data: {cmd: 'count_mutations', mutation_profile: _studyId + '_mutations'}
                    });
                  })).done(function () {
                    if(_mutCountStudyIdArr.length==1){
                      _ajaxMutationCountData = $.extend({}, arguments[0], _ajaxMutationCountData);
                    }else{
                      for (var i = 0; i < arguments.length; i++) {
                        _ajaxMutationCountData = $.extend({}, arguments[i][0], _ajaxMutationCountData);
                      }
                    }

                    // mutation data
                    var _mutDataStudyIdArr = _.filter(_studyIdArr, function (_studyId) {
                      return $.inArray(_studyId + '_mutations', _.pluck(_ajaxGeneticProfiles, 'id')) !== -1;
                    });
                    $.when.apply($, _mutDataStudyIdArr.map(function (_studyId) {
                      return $.ajax({
                        method: "POST",
                        url: PORTAL_INST_URL + '/mutations.json?',
                        data: {cmd: 'get_smg', mutation_profile: _studyId + '_mutations'}
                      });
                    })).done(function () {
                      _results = [];
                      if(_mutDataStudyIdArr.length==1){
                        _results = _results.concat(arguments[0]);
                      }else{
                        for (var i = 0; i < arguments.length; i++) {
                          _results = _results.concat(arguments[i][0]);
                        }
                      }
                      _ajaxMutGenesData = _results;

                      // cna fraction data
                      $.when.apply($, _studyIdArr.map(function (_studyId) {
                        return $.ajax({
                          method: "POST",
                          url: PORTAL_INST_URL + '/cna.json?',
                          data: {cmd: 'get_cna_fraction', cancer_study_id: _studyId}
                        });
                      })).done(function () {
                        if(_studyIdArr.length==1){
                          _ajaxCnaFractionData = $.extend({}, arguments[0], _ajaxCnaFractionData);
                        }else{
                          for (var i = 0; i < arguments.length; i++) {
                            _ajaxCnaFractionData = $.extend({}, arguments[i][0], _ajaxCnaFractionData);
                          }
                        }

                        // cna table data
                        var _gisticStudyIdArr = _.filter(_studyIdArr, function (_studyId) {
                          return $.inArray(_studyId + '_gistic', _.pluck(_ajaxGeneticProfiles, 'id')) !== -1;
                        });
                        $.when.apply($, _gisticStudyIdArr.map(function (_studyId) {
                          return $.ajax({
                            method: "POST",
                            url: PORTAL_INST_URL + '/cna.json?',
                            data: {cbio_genes_filter: true, cna_profile: _studyId + "_gistic"}
                          });
                        })).done(function () {
                          _ajaxCnaData.gene = [];
                          _ajaxCnaData.gistic = [];
                          _ajaxCnaData.cytoband = [];
                          _ajaxCnaData.alter = [];
                          _ajaxCnaData.caseIds = [];
                          if(_studyIdArr.length==1){
                            _ajaxCnaData.gene = _ajaxCnaData.gene.concat(arguments[0].gene);
                            _ajaxCnaData.gistic = _ajaxCnaData.gistic.concat(arguments[0].gistic);
                            _ajaxCnaData.cytoband = _ajaxCnaData.cytoband.concat(arguments[0].cytoband);
                            _ajaxCnaData.alter = _ajaxCnaData.alter.concat(arguments[0].alter);
                            _ajaxCnaData.caseIds = _ajaxCnaData.caseIds.concat(arguments[0].caseIds);
                          }else{
                            for (var i = 0; i < arguments.length; i++) {
                              _ajaxCnaData.gene = _ajaxCnaData.gene.concat(arguments[i][0].gene);
                              _ajaxCnaData.gistic = _ajaxCnaData.gistic.concat(arguments[i][0].gistic);
                              _ajaxCnaData.cytoband = _ajaxCnaData.cytoband.concat(arguments[i][0].cytoband);
                              _ajaxCnaData.alter = _ajaxCnaData.alter.concat(arguments[i][0].alter);
                              _ajaxCnaData.caseIds = _ajaxCnaData.caseIds.concat(arguments[i][0].caseIds);
                            }
                          }
                          // --- web API results converting ----
                          var _patientData = [], _sampleData = [];
                          var _patientIds = {};
                          var _indexSample = 0, _sampleDataIndicesObj = {};
                          var _storedCnaGeneInventory = {}, _storedCnaGeneIndex = 0;
                          var _storedMutGeneInventory = {}, _storedMutGeneIndex = 0;
                          var _ajaxPatient2SampleIdMappingObjSimplified = {};
                          _.each(Object.keys(_ajaxPatient2SampleIdMappingObj), function (_tmpPatientId) {
                            // _patientIds.push(_tmpPatientId);
                            var _sampleIdArr = _ajaxPatient2SampleIdMappingObj[_tmpPatientId]['sample_ids'];
                            var _studyId = _ajaxPatient2SampleIdMappingObj[_tmpPatientId]['study_id'];
                            _patientIds[_tmpPatientId]=_studyId;
                            _ajaxPatient2SampleIdMappingObjSimplified[_tmpPatientId]=_sampleIdArr;
                            _.each(_sampleIdArr, function (_sampleId) {
                              // map from sample to patient
                              _ajaxSample2PatientIdMappingObj[_sampleId] = [_tmpPatientId];
                              var _datum = {};
                              _datum['sample_id'] = _sampleId;
                              _datum['study_id'] = _studyId;
                              _.each(_ajaxSampleData, function (_dataObj) {
                                if (_dataObj['sample_id'] === _sampleId) {
                                  _datum[_dataObj['attr_id']] = _dataObj['attr_val'];
                                }
                              });
                              // indices
                              _sampleDataIndicesObj[_sampleId] = _indexSample;
                              _indexSample += 1;
                              // mutation count
                              if (_ajaxMutationCountData[_sampleId] === undefined || _ajaxMutationCountData[_sampleId] === null) {
                                _datum['mutation_count'] = 'NA';
                              } else {
                                _datum['mutation_count'] = _ajaxMutationCountData[_sampleId];
                              }
                              // cna fraction
                              if (_ajaxCnaFractionData[_sampleId] === undefined || _ajaxCnaFractionData[_sampleId] === null) {
                                _datum['cna_fraction'] = 0;
                              } else {
                                _datum['cna_fraction'] = _ajaxCnaFractionData[_sampleId];
                              }
                              // mutation gene data
                              _datum['mutated_genes'] = [];
                              _.each(_ajaxMutGenesData, function (_mutGeneDataObj) {
                                _.each(_mutGeneDataObj.caseIds, function (_caseId) {
                                  if (_caseId === _sampleId) {
                                    if (_storedMutGeneInventory.hasOwnProperty(_mutGeneDataObj.gene_symbol)) { // if gene is already stored in the inventory
                                      _datum['mutated_genes'].push(_storedMutGeneInventory[_mutGeneDataObj.gene_symbol].index);
                                      _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].num_muts = _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].num_muts+1;
                                      _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].caseIds.push(_caseId);
                                    } else {
                                      _storedMutGeneInventory[_mutGeneDataObj.gene_symbol] = {};
                                      _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].gene = _mutGeneDataObj.gene_symbol;
                                      _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].num_muts = 1;
                                      _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].caseIds = [_caseId];
                                      if ((_studyIdArr.length==1) && _mutGeneDataObj.hasOwnProperty('qval')) {
                                        _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].qval = _mutGeneDataObj.qval;
                                      } else {
                                        _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].qval = null;
                                      }
                                      _storedMutGeneInventory[_mutGeneDataObj.gene_symbol].index = _storedMutGeneIndex;
                                      _datum['mutated_genes'].push(_storedMutGeneIndex);
                                      _storedMutGeneIndex += 1;
                                    }
                                  }
                                });
                              });
                              // cna data
                              _datum['cna_details'] = [];
                              $.each(_ajaxCnaData.caseIds, function (_index, _caseIdsPerGene) {
                                _.each(_caseIdsPerGene, function (_caseId) {
                                  if (_sampleId === _caseId) {
                                    if (_storedCnaGeneInventory.hasOwnProperty(_ajaxCnaData.gene[_index])) { // if gene is already stored in the inventory
                                      _datum['cna_details'].push(_storedCnaGeneInventory[_ajaxCnaData.gene[_index]].index);
                                      _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].caseIds.push(_caseId);
                                    } else { // create a new gene entry
                                      _storedCnaGeneInventory[_ajaxCnaData.gene[_index]] = {};
                                      _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].gene = _ajaxCnaData.gene[_index];
                                      var _altType='';
                                      switch (_ajaxCnaData.alter[_index]) {
                                        case -2:
                                          _altType = 'DEL';
                                          break;
                                        case 2:
                                          _altType = 'AMP';
                                          break;
                                        default:
                                          break;
                                      }
                                      _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].cna = _altType;
                                      _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].cytoband = _ajaxCnaData.cytoband[_index];
                                      _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].caseIds = [_caseId];
                                      if ((_studyIdArr.length !==1) || _ajaxCnaData.gistic[_index] === null) {
                                        _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].qval = null;
                                      } else {
                                        _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].qval = _ajaxCnaData.gistic[_index][0];
                                      }
                                      _storedCnaGeneInventory[_ajaxCnaData.gene[_index]].index = _storedCnaGeneIndex;
                                      _datum['cna_details'].push(_storedCnaGeneIndex);
                                      _storedCnaGeneIndex += 1;
                                    }
                                  }
                                });
                              });
                              // final push
                              _sampleData.push(_datum);
                            });
                          });

                          //add Mutation Count chart
                          if(_ajaxMutationCountData.length !=0){
                            var _MutationCountMeta = {};
                            _MutationCountMeta.datatype = 'NUMBER';
                            _MutationCountMeta.description = "Mutation Count";
                            _MutationCountMeta.display_name = "Mutation Count";
                            _MutationCountMeta.attr_id = "mutation_count";
                            _MutationCountMeta.view_type = 'bar_chart';
                            _ajaxSampleMeta.unshift(_MutationCountMeta);
                          }

                          // add CNA details
                          if (_gisticStudyIdArr.length !== 0) {
                            var _cnaAttrMeta = {};
                            _cnaAttrMeta.type = 'cna';
                            _cnaAttrMeta.view_type = 'table';
                            _cnaAttrMeta.display_name = 'Copy Number Alterations';
                            _cnaAttrMeta.description = 'Copy Number Alterations';
                            _cnaAttrMeta.gene_list = _storedCnaGeneInventory;
                            _cnaAttrMeta.attr_id = 'cna_details';
                            _cnaAttrMeta.options = {
                              allCases : _allSampleIds,
                              sequencedCases : _cnaSampleIds.length>0 ? _cnaSampleIds : _allSampleIds
                            }
                            _ajaxSampleMeta.unshift(_cnaAttrMeta);
                          }

                          // add Gene Mutation Info
                          if (_mutDataStudyIdArr.length !== 0) {
                            var _mutDataAttrMeta = {};
                            _mutDataAttrMeta.type = 'mutatedGene';
                            _mutDataAttrMeta.view_type = 'table';
                            _mutDataAttrMeta.display_name = 'Mutated Genes';
                            _mutDataAttrMeta.description = 'Mutated Genes';
                            _mutDataAttrMeta.gene_list = _storedMutGeneInventory;
                            _mutDataAttrMeta.attr_id = 'mutated_genes';
                            _mutDataAttrMeta.options = {
                              allCases : _allSampleIds,
                              sequencedCases : _sequencedSampleIds.length>0 ? _sequencedSampleIds : _allSampleIds
                            }
                            _ajaxSampleMeta.unshift(_mutDataAttrMeta);
                          }

                          // add Mutation count vs. CNA fraction
                          var _mutCntAttrMeta = {};
                          _mutCntAttrMeta.attr_id = 'MUT_CNT_VS_CNA';
                          _mutCntAttrMeta.datatype = 'SCATTER_PLOT';
                          _mutCntAttrMeta.view_type = 'scatter_plot';
                          _mutCntAttrMeta.description = 'Mutation Count vs. CNA';
                          _mutCntAttrMeta.display_name = 'Mutation Count vs. CNA';
                          _ajaxSampleMeta.unshift(_mutCntAttrMeta);

                          // add DFS survival
                          var _dfsSurvivalAttrMeta = {};
                          _dfsSurvivalAttrMeta.attr_id = 'DFS_SURVIVAL';
                          _dfsSurvivalAttrMeta.datatype = 'SURVIVAL';
                          _dfsSurvivalAttrMeta.view_type = 'survival';
                          _dfsSurvivalAttrMeta.description = 'Disease Free Survival';
                          _dfsSurvivalAttrMeta.display_name = 'Disease Free Survival';
                          _ajaxPatientMeta.unshift(_dfsSurvivalAttrMeta);

                          // add OS survival
                          var _osSurvivalAttrMeta = {};
                          _osSurvivalAttrMeta.attr_id = 'OS_SURVIVAL';
                          _osSurvivalAttrMeta.datatype = 'SURVIVAL';
                          _osSurvivalAttrMeta.view_type = 'survival';
                          _osSurvivalAttrMeta.description = 'Overall Survival';
                          _osSurvivalAttrMeta.display_name = 'Overall Survival';
                          _ajaxPatientMeta.unshift(_osSurvivalAttrMeta);

                          // add Cancer Study
                          _ajaxPatientMeta.unshift({
                            "datatype": "STRING",
                            "description": "Cancer Types",
                            "display_name": "Cancer Types",
                            "attr_id": "study_id",
                            "view_type": "pie_chart"
                          });

                          var _indexPatient = 0, _patientDataIndicesObj = {};
                          _.each(Object.keys(_patientIds), function (_patientId) {
                            var _datum = {};
                            _datum['patient_id'] = _patientId;
                            _datum['study_id'] = _patientIds[_patientId];
                            _.each(_ajaxPatientData, function (_dataObj) {
                              if (_dataObj['patient_id'] === _patientId) {
                                _datum[_dataObj['attr_id']] = _dataObj['attr_val'];
                              }
                            });
                            _patientDataIndicesObj[_patientId] = _indexPatient;
                            _indexPatient += 1;
                            _patientData.push(_datum);
                          });

                          // TODO : temporary fix to show/hide charts
                          var tempCount = 0;
                          // define view type from data type
                          _.each(_ajaxSampleMeta, function (_metaObj) {
                            _metaObj.filter = [];
                            if (tempCount < 10) _metaObj.show = true;
                            else _metaObj.show = false;
                            if (_metaObj.datatype === "NUMBER") {
                              _metaObj.view_type = 'bar_chart';
                            } else if (_metaObj.datatype === "STRING") {
                              _metaObj.view_type = 'pie_chart';
                            }
                            tempCount++;
                          });
                          tempCount = 0;
                          _.each(_ajaxPatientMeta, function (_metaObj) {
                            _metaObj.filter = [];
                            if (tempCount < 10) _metaObj.show = true;
                            else _metaObj.show = false;
                            if (_metaObj.datatype === "NUMBER") {
                              _metaObj.view_type = 'bar_chart';
                            } else if (_metaObj.datatype === "STRING") {
                              _metaObj.view_type = 'pie_chart';
                            }
                            tempCount++;
                          });

                          // add Cancer Study
                          _ajaxPatientMeta.push({
                            "datatype": "STRING",
                            "description": "Patient Ids",
                            "display_name": "Patient Ids",
                            "attr_id": "patient_id",
                            "view_type": "pie_chart",
                            "show":false,
                            "filter":[]
                          });
                          _ajaxSampleMeta.push({
                            "datatype": "STRING",
                            "description": "Sample Ids",
                            "display_name": "Sample Ids",
                            "attr_id": "sample_id",
                            "view_type": "pie_chart",
                            "show":false,
                            "filter":[]
                          });


                          _result.groups = {};
                          _result.groups.patient = {};
                          _result.groups.sample = {};
                          _result.groups.group_mapping = {};
                          _result.groups.patient.attr_meta = _ajaxPatientMeta;
                          _result.groups.sample.attr_meta = _ajaxSampleMeta;
                          _result.groups.patient.data = _patientData;
                          _result.groups.sample.data = _sampleData;
                          _result.groups.patient.data_indices = {};
                          _result.groups.sample.data_indices = {};
                          _result.groups.patient.data_indices.patient_id = _patientDataIndicesObj;
                          _result.groups.sample.data_indices.sample_id = _sampleDataIndicesObj;
                          _result.groups.group_mapping.sample = {};
                          _result.groups.group_mapping.patient = {};
                          _result.groups.group_mapping.sample.patient = _ajaxSample2PatientIdMappingObj;
                          _result.groups.group_mapping.patient.sample = _ajaxPatient2SampleIdMappingObjSimplified;

                          _callBackFunc(_result, _inputSampleList, _inputPatientList);

                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }
}(window.iViz, window.$));